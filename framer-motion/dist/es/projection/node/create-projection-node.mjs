import sync, { cancelSync, flushSync } from 'framesync';
import { mix } from 'popmotion';
import { animate } from '../../animation/animate.mjs';
import { SubscriptionManager } from '../../utils/subscription-manager.mjs';
import { mixValues } from '../animation/mix-values.mjs';
import { copyBoxInto } from '../geometry/copy.mjs';
import { translateAxis, transformBox, applyBoxDelta, applyTreeDeltas } from '../geometry/delta-apply.mjs';
import { calcRelativePosition, calcRelativeBox, calcBoxDelta, calcLength } from '../geometry/delta-calc.mjs';
import { removeBoxTransforms } from '../geometry/delta-remove.mjs';
import { createBox, createDelta } from '../geometry/models.mjs';
import { getValueTransition } from '../../animation/utils/transitions.mjs';
import { boxEquals, isDeltaZero } from '../geometry/utils.mjs';
import { NodeStack } from '../shared/stack.mjs';
import { scaleCorrectors } from '../styles/scale-correction.mjs';
import { buildProjectionTransform } from '../styles/transform.mjs';
import { eachAxis } from '../utils/each-axis.mjs';
import { hasTransform, hasScale } from '../utils/has-transform.mjs';
import { transformAxes } from '../../render/html/utils/transform.mjs';
import { FlatTree } from '../../render/utils/flat-tree.mjs';
import { resolveMotionValue } from '../../value/utils/resolve-motion-value.mjs';
import { globalProjectionState } from './state.mjs';

/**
 * We use 1000 as the animation target as 0-1000 maps better to pixels than 0-1
 * which has a noticeable difference in spring animations
 */
const animationTarget = 1000;
function createProjectionNode({ attachResizeListener, defaultParent, measureScroll, checkIsScrollRoot, resetTransform, }) {
    return class ProjectionNode {
        constructor(id, latestValues = {}, parent = defaultParent === null || defaultParent === void 0 ? void 0 : defaultParent()) {
            /**
             * A Set containing all this component's children. This is used to iterate
             * through the children.
             *
             * TODO: This could be faster to iterate as a flat array stored on the root node.
             */
            this.children = new Set();
            /**
             * Options for the node. We use this to configure what kind of layout animations
             * we should perform (if any).
             */
            this.options = {};
            /**
             * We use this to detect when its safe to shut down part of a projection tree.
             * We have to keep projecting children for scale correction and relative projection
             * until all their parents stop performing layout animations.
             */
            this.isTreeAnimating = false;
            this.isAnimationBlocked = false;
            /**
             * Flag to true if we think this layout has been changed. We can't always know this,
             * currently we set it to true every time a component renders, or if it has a layoutDependency
             * if that has changed between renders. Additionally, components can be grouped by LayoutGroup
             * and if one node is dirtied, they all are.
             */
            this.isLayoutDirty = false;
            /**
             * Block layout updates for instant layout transitions throughout the tree.
             */
            this.updateManuallyBlocked = false;
            this.updateBlockedByResize = false;
            /**
             * Set to true between the start of the first `willUpdate` call and the end of the `didUpdate`
             * call.
             */
            this.isUpdating = false;
            /**
             * If this is an SVG element we currently disable projection transforms
             */
            this.isSVG = false;
            /**
             * Flag to true (during promotion) if a node doing an instant layout transition needs to reset
             * its projection styles.
             */
            this.needsReset = false;
            /**
             * Flags whether this node should have its transform reset prior to measuring.
             */
            this.shouldResetTransform = false;
            /**
             * An object representing the calculated contextual/accumulated/tree scale.
             * This will be used to scale calculcated projection transforms, as these are
             * calculated in screen-space but need to be scaled for elements to actually
             * make it to their calculated destinations.
             *
             * TODO: Lazy-init
             */
            this.treeScale = { x: 1, y: 1 };
            /**
             *
             */
            this.eventHandlers = new Map();
            // Note: Currently only running on root node
            this.potentialNodes = new Map();
            this.checkUpdateFailed = () => {
                if (this.isUpdating) {
                    this.isUpdating = false;
                    this.clearAllSnapshots();
                }
            };
            this.updateProjection = () => {
                this.nodes.forEach(resolveTargetDelta);
                this.nodes.forEach(calcProjection);
            };
            this.hasProjected = false;
            this.isVisible = true;
            this.animationProgress = 0;
            /**
             * Shared layout
             */
            // TODO Only running on root node
            this.sharedNodes = new Map();
            this.id = id;
            this.latestValues = latestValues;
            this.root = parent ? parent.root || parent : this;
            this.path = parent ? [...parent.path, parent] : [];
            this.parent = parent;
            this.depth = parent ? parent.depth + 1 : 0;
            id && this.root.registerPotentialNode(id, this);
            for (let i = 0; i < this.path.length; i++) {
                this.path[i].shouldResetTransform = true;
            }
            if (this.root === this)
                this.nodes = new FlatTree();
        }
        addEventListener(name, handler) {
            if (!this.eventHandlers.has(name)) {
                this.eventHandlers.set(name, new SubscriptionManager());
            }
            return this.eventHandlers.get(name).add(handler);
        }
        notifyListeners(name, ...args) {
            const subscriptionManager = this.eventHandlers.get(name);
            subscriptionManager === null || subscriptionManager === void 0 ? void 0 : subscriptionManager.notify(...args);
        }
        hasListeners(name) {
            return this.eventHandlers.has(name);
        }
        registerPotentialNode(id, node) {
            this.potentialNodes.set(id, node);
        }
        /**
         * Lifecycles
         */
        mount(instance, isLayoutDirty = false) {
            var _a;
            if (this.instance)
                return;
            this.isSVG =
                instance instanceof SVGElement && instance.tagName !== "svg";
            this.instance = instance;
            const { layoutId, layout, visualElement } = this.options;
            if (visualElement && !visualElement.getInstance()) {
                visualElement.mount(instance);
            }
            this.root.nodes.add(this);
            (_a = this.parent) === null || _a === void 0 ? void 0 : _a.children.add(this);
            this.id && this.root.potentialNodes.delete(this.id);
            if (isLayoutDirty && (layout || layoutId)) {
                this.isLayoutDirty = true;
            }
            if (attachResizeListener) {
                let unblockTimeout;
                const resizeUnblockUpdate = () => (this.root.updateBlockedByResize = false);
                attachResizeListener(instance, () => {
                    this.root.updateBlockedByResize = true;
                    clearTimeout(unblockTimeout);
                    unblockTimeout = window.setTimeout(resizeUnblockUpdate, 250);
                    if (globalProjectionState.hasAnimatedSinceResize) {
                        globalProjectionState.hasAnimatedSinceResize = false;
                        this.nodes.forEach(finishAnimation);
                    }
                });
            }
            if (layoutId) {
                this.root.registerSharedNode(layoutId, this);
            }
            // Only register the handler if it requires layout animation
            if (this.options.animate !== false &&
                visualElement &&
                (layoutId || layout)) {
                this.addEventListener("didUpdate", ({ delta, hasLayoutChanged, hasRelativeTargetChanged, layout: newLayout, }) => {
                    var _a, _b, _c, _d, _e;
                    if (this.isTreeAnimationBlocked()) {
                        this.target = undefined;
                        this.relativeTarget = undefined;
                        return;
                    }
                    // TODO: Check here if an animation exists
                    const layoutTransition = (_b = (_a = this.options.transition) !== null && _a !== void 0 ? _a : visualElement.getDefaultTransition()) !== null && _b !== void 0 ? _b : defaultLayoutTransition;
                    const { onLayoutAnimationStart, onLayoutAnimationComplete, } = visualElement.getProps();
                    /**
                     * The target layout of the element might stay the same,
                     * but its position relative to its parent has changed.
                     */
                    const targetChanged = !this.targetLayout ||
                        !boxEquals(this.targetLayout, newLayout) ||
                        hasRelativeTargetChanged;
                    /**
                     * If the layout hasn't seemed to have changed, it might be that the
                     * element is visually in the same place in the document but its position
                     * relative to its parent has indeed changed. So here we check for that.
                     */
                    const hasOnlyRelativeTargetChanged = !hasLayoutChanged && hasRelativeTargetChanged;
                    if (((_c = this.resumeFrom) === null || _c === void 0 ? void 0 : _c.instance) ||
                        hasOnlyRelativeTargetChanged ||
                        (hasLayoutChanged &&
                            (targetChanged || !this.currentAnimation))) {
                        if (this.resumeFrom) {
                            this.resumingFrom = this.resumeFrom;
                            this.resumingFrom.resumingFrom = undefined;
                        }
                        this.setAnimationOrigin(delta, hasOnlyRelativeTargetChanged);
                        const animationOptions = Object.assign(Object.assign({}, getValueTransition(layoutTransition, "layout")), { onPlay: onLayoutAnimationStart, onComplete: onLayoutAnimationComplete });
                        if (visualElement.shouldReduceMotion) {
                            animationOptions.delay = 0;
                            animationOptions.type = false;
                        }
                        this.startAnimation(animationOptions);
                    }
                    else {
                        /**
                         * If the layout hasn't changed and we have an animation that hasn't started yet,
                         * finish it immediately. Otherwise it will be animating from a location
                         * that was probably never commited to screen and look like a jumpy box.
                         */
                        if (!hasLayoutChanged &&
                            this.animationProgress === 0) {
                            this.finishAnimation();
                        }
                        this.isLead() && ((_e = (_d = this.options).onExitComplete) === null || _e === void 0 ? void 0 : _e.call(_d));
                    }
                    this.targetLayout = newLayout;
                });
            }
        }
        unmount() {
            var _a, _b;
            this.options.layoutId && this.willUpdate();
            this.root.nodes.remove(this);
            (_a = this.getStack()) === null || _a === void 0 ? void 0 : _a.remove(this);
            (_b = this.parent) === null || _b === void 0 ? void 0 : _b.children.delete(this);
            this.instance = undefined;
            cancelSync.preRender(this.updateProjection);
        }
        // only on the root
        blockUpdate() {
            this.updateManuallyBlocked = true;
        }
        unblockUpdate() {
            this.updateManuallyBlocked = false;
        }
        isUpdateBlocked() {
            return this.updateManuallyBlocked || this.updateBlockedByResize;
        }
        isTreeAnimationBlocked() {
            var _a;
            return (this.isAnimationBlocked ||
                ((_a = this.parent) === null || _a === void 0 ? void 0 : _a.isTreeAnimationBlocked()) ||
                false);
        }
        // Note: currently only running on root node
        startUpdate() {
            var _a;
            if (this.isUpdateBlocked())
                return;
            this.isUpdating = true;
            (_a = this.nodes) === null || _a === void 0 ? void 0 : _a.forEach(resetRotation);
        }
        willUpdate(shouldNotifyListeners = true) {
            var _a, _b, _c;
            if (this.root.isUpdateBlocked()) {
                (_b = (_a = this.options).onExitComplete) === null || _b === void 0 ? void 0 : _b.call(_a);
                return;
            }
            !this.root.isUpdating && this.root.startUpdate();
            if (this.isLayoutDirty)
                return;
            this.isLayoutDirty = true;
            for (let i = 0; i < this.path.length; i++) {
                const node = this.path[i];
                node.shouldResetTransform = true;
                /**
                 * TODO: Check we haven't updated the scroll
                 * since the last didUpdate
                 */
                node.updateScroll();
            }
            const { layoutId, layout } = this.options;
            if (layoutId === undefined && !layout)
                return;
            const transformTemplate = (_c = this.options.visualElement) === null || _c === void 0 ? void 0 : _c.getProps().transformTemplate;
            this.prevTransformTemplateValue = transformTemplate === null || transformTemplate === void 0 ? void 0 : transformTemplate(this.latestValues, "");
            this.updateSnapshot();
            shouldNotifyListeners && this.notifyListeners("willUpdate");
        }
        // Note: Currently only running on root node
        didUpdate() {
            const updateWasBlocked = this.isUpdateBlocked();
            // When doing an instant transition, we skip the layout update,
            // but should still clean up the measurements so that the next
            // snapshot could be taken correctly.
            if (updateWasBlocked) {
                this.unblockUpdate();
                this.clearAllSnapshots();
                this.nodes.forEach(clearMeasurements);
                return;
            }
            if (!this.isUpdating)
                return;
            this.isUpdating = false;
            /**
             * Search for and mount newly-added projection elements.
             *
             * TODO: Every time a new component is rendered we could search up the tree for
             * the closest mounted node and query from there rather than document.
             */
            if (this.potentialNodes.size) {
                this.potentialNodes.forEach(mountNodeEarly);
                this.potentialNodes.clear();
            }
            /**
             * Write
             */
            this.nodes.forEach(resetTransformStyle);
            /**
             * Read ==================
             */
            // Update layout measurements of updated children
            this.nodes.forEach(updateLayout);
            /**
             * Write
             */
            // Notify listeners that the layout is updated
            this.nodes.forEach(notifyLayoutUpdate);
            this.clearAllSnapshots();
            // Flush any scheduled updates
            flushSync.update();
            flushSync.preRender();
            flushSync.render();
        }
        clearAllSnapshots() {
            this.nodes.forEach(clearSnapshot);
            this.sharedNodes.forEach(removeLeadSnapshots);
        }
        scheduleUpdateProjection() {
            sync.preRender(this.updateProjection, false, true);
        }
        scheduleCheckAfterUnmount() {
            /**
             * If the unmounting node is in a layoutGroup and did trigger a willUpdate,
             * we manually call didUpdate to give a chance to the siblings to animate.
             * Otherwise, cleanup all snapshots to prevents future nodes from reusing them.
             */
            sync.postRender(() => {
                if (this.isLayoutDirty) {
                    this.root.didUpdate();
                }
                else {
                    this.root.checkUpdateFailed();
                }
            });
        }
        /**
         * Update measurements
         */
        updateSnapshot() {
            if (this.snapshot || !this.instance)
                return;
            const measured = this.measure();
            const layout = this.removeTransform(this.removeElementScroll(measured));
            roundBox(layout);
            this.snapshot = {
                measured,
                layout,
                latestValues: {},
            };
        }
        updateLayout() {
            var _a;
            if (!this.instance)
                return;
            // TODO: Incorporate into a forwarded scroll offset
            this.updateScroll();
            if (!(this.options.alwaysMeasureLayout && this.isLead()) &&
                !this.isLayoutDirty) {
                return;
            }
            /**
             * When a node is mounted, it simply resumes from the prevLead's
             * snapshot instead of taking a new one, but the ancestors scroll
             * might have updated while the prevLead is unmounted. We need to
             * update the scroll again to make sure the layout we measure is
             * up to date.
             */
            if (this.resumeFrom && !this.resumeFrom.instance) {
                for (let i = 0; i < this.path.length; i++) {
                    const node = this.path[i];
                    node.updateScroll();
                }
            }
            const measured = this.measure();
            roundBox(measured);
            const prevLayout = this.layout;
            this.layout = {
                measured,
                actual: this.removeElementScroll(measured),
            };
            this.layoutCorrected = createBox();
            this.isLayoutDirty = false;
            this.projectionDelta = undefined;
            this.notifyListeners("measure", this.layout.actual);
            (_a = this.options.visualElement) === null || _a === void 0 ? void 0 : _a.notifyLayoutMeasure(this.layout.actual, prevLayout === null || prevLayout === void 0 ? void 0 : prevLayout.actual);
        }
        updateScroll() {
            if (this.options.layoutScroll && this.instance) {
                this.isScrollRoot = checkIsScrollRoot(this.instance);
                this.scroll = measureScroll(this.instance);
            }
        }
        resetTransform() {
            var _a;
            if (!resetTransform)
                return;
            const isResetRequested = this.isLayoutDirty || this.shouldResetTransform;
            const hasProjection = this.projectionDelta && !isDeltaZero(this.projectionDelta);
            const transformTemplate = (_a = this.options.visualElement) === null || _a === void 0 ? void 0 : _a.getProps().transformTemplate;
            const transformTemplateValue = transformTemplate === null || transformTemplate === void 0 ? void 0 : transformTemplate(this.latestValues, "");
            const transformTemplateHasChanged = transformTemplateValue !== this.prevTransformTemplateValue;
            if (isResetRequested &&
                (hasProjection ||
                    hasTransform(this.latestValues) ||
                    transformTemplateHasChanged)) {
                resetTransform(this.instance, transformTemplateValue);
                this.shouldResetTransform = false;
                this.scheduleRender();
            }
        }
        measure() {
            const { visualElement } = this.options;
            if (!visualElement)
                return createBox();
            const box = visualElement.measureViewportBox();
            // Remove viewport scroll to give page-relative coordinates
            const { scroll } = this.root;
            if (scroll) {
                translateAxis(box.x, scroll.x);
                translateAxis(box.y, scroll.y);
            }
            return box;
        }
        removeElementScroll(box) {
            const boxWithoutScroll = createBox();
            copyBoxInto(boxWithoutScroll, box);
            /**
             * Performance TODO: Keep a cumulative scroll offset down the tree
             * rather than loop back up the path.
             */
            for (let i = 0; i < this.path.length; i++) {
                const node = this.path[i];
                const { scroll, options, isScrollRoot } = node;
                if (node !== this.root && scroll && options.layoutScroll) {
                    /**
                     * If this is a new scroll root, we want to remove all previous scrolls
                     * from the viewport box.
                     */
                    if (isScrollRoot) {
                        copyBoxInto(boxWithoutScroll, box);
                        const { scroll: rootScroll } = this.root;
                        /**
                         * Undo the application of page scroll that was originally added
                         * to the measured bounding box.
                         */
                        if (rootScroll) {
                            translateAxis(boxWithoutScroll.x, -rootScroll.x);
                            translateAxis(boxWithoutScroll.y, -rootScroll.y);
                        }
                    }
                    translateAxis(boxWithoutScroll.x, scroll.x);
                    translateAxis(boxWithoutScroll.y, scroll.y);
                }
            }
            return boxWithoutScroll;
        }
        applyTransform(box, transformOnly = false) {
            const withTransforms = createBox();
            copyBoxInto(withTransforms, box);
            for (let i = 0; i < this.path.length; i++) {
                const node = this.path[i];
                if (!transformOnly &&
                    node.options.layoutScroll &&
                    node.scroll &&
                    node !== node.root) {
                    transformBox(withTransforms, {
                        x: -node.scroll.x,
                        y: -node.scroll.y,
                    });
                }
                if (!hasTransform(node.latestValues))
                    continue;
                transformBox(withTransforms, node.latestValues);
            }
            if (hasTransform(this.latestValues)) {
                transformBox(withTransforms, this.latestValues);
            }
            return withTransforms;
        }
        removeTransform(box) {
            var _a;
            const boxWithoutTransform = createBox();
            copyBoxInto(boxWithoutTransform, box);
            for (let i = 0; i < this.path.length; i++) {
                const node = this.path[i];
                if (!node.instance)
                    continue;
                if (!hasTransform(node.latestValues))
                    continue;
                hasScale(node.latestValues) && node.updateSnapshot();
                const sourceBox = createBox();
                const nodeBox = node.measure();
                copyBoxInto(sourceBox, nodeBox);
                removeBoxTransforms(boxWithoutTransform, node.latestValues, (_a = node.snapshot) === null || _a === void 0 ? void 0 : _a.layout, sourceBox);
            }
            if (hasTransform(this.latestValues)) {
                removeBoxTransforms(boxWithoutTransform, this.latestValues);
            }
            return boxWithoutTransform;
        }
        /**
         *
         */
        setTargetDelta(delta) {
            this.targetDelta = delta;
            this.root.scheduleUpdateProjection();
        }
        setOptions(options) {
            var _a;
            this.options = Object.assign(Object.assign(Object.assign({}, this.options), options), { crossfade: (_a = options.crossfade) !== null && _a !== void 0 ? _a : true });
        }
        clearMeasurements() {
            this.scroll = undefined;
            this.layout = undefined;
            this.snapshot = undefined;
            this.prevTransformTemplateValue = undefined;
            this.targetDelta = undefined;
            this.target = undefined;
            this.isLayoutDirty = false;
        }
        /**
         * Frame calculations
         */
        resolveTargetDelta() {
            var _a;
            const { layout, layoutId } = this.options;
            /**
             * If we have no layout, we can't perform projection, so early return
             */
            if (!this.layout || !(layout || layoutId))
                return;
            /**
             * If we don't have a targetDelta but do have a layout, we can attempt to resolve
             * a relativeParent. This will allow a component to perform scale correction
             * even if no animation has started.
             */
            // TODO If this is unsuccessful this currently happens every frame
            if (!this.targetDelta && !this.relativeTarget) {
                // TODO: This is a semi-repetition of further down this function, make DRY
                this.relativeParent = this.getClosestProjectingParent();
                if (this.relativeParent && this.relativeParent.layout) {
                    this.relativeTarget = createBox();
                    this.relativeTargetOrigin = createBox();
                    calcRelativePosition(this.relativeTargetOrigin, this.layout.actual, this.relativeParent.layout.actual);
                    copyBoxInto(this.relativeTarget, this.relativeTargetOrigin);
                }
            }
            /**
             * If we have no relative target or no target delta our target isn't valid
             * for this frame.
             */
            if (!this.relativeTarget && !this.targetDelta)
                return;
            /**
             * Lazy-init target data structure
             */
            if (!this.target) {
                this.target = createBox();
                this.targetWithTransforms = createBox();
            }
            /**
             * If we've got a relative box for this component, resolve it into a target relative to the parent.
             */
            if (this.relativeTarget &&
                this.relativeTargetOrigin &&
                ((_a = this.relativeParent) === null || _a === void 0 ? void 0 : _a.target)) {
                calcRelativeBox(this.target, this.relativeTarget, this.relativeParent.target);
                /**
                 * If we've only got a targetDelta, resolve it into a target
                 */
            }
            else if (this.targetDelta) {
                if (Boolean(this.resumingFrom)) {
                    // TODO: This is creating a new object every frame
                    this.target = this.applyTransform(this.layout.actual);
                }
                else {
                    copyBoxInto(this.target, this.layout.actual);
                }
                applyBoxDelta(this.target, this.targetDelta);
            }
            else {
                /**
                 * If no target, use own layout as target
                 */
                copyBoxInto(this.target, this.layout.actual);
            }
            /**
             * If we've been told to attempt to resolve a relative target, do so.
             */
            if (this.attemptToResolveRelativeTarget) {
                this.attemptToResolveRelativeTarget = false;
                this.relativeParent = this.getClosestProjectingParent();
                if (this.relativeParent &&
                    Boolean(this.relativeParent.resumingFrom) ===
                        Boolean(this.resumingFrom) &&
                    !this.relativeParent.options.layoutScroll &&
                    this.relativeParent.target) {
                    this.relativeTarget = createBox();
                    this.relativeTargetOrigin = createBox();
                    calcRelativePosition(this.relativeTargetOrigin, this.target, this.relativeParent.target);
                    copyBoxInto(this.relativeTarget, this.relativeTargetOrigin);
                }
            }
        }
        getClosestProjectingParent() {
            if (!this.parent || hasTransform(this.parent.latestValues))
                return undefined;
            if ((this.parent.relativeTarget || this.parent.targetDelta) &&
                this.parent.layout) {
                return this.parent;
            }
            else {
                return this.parent.getClosestProjectingParent();
            }
        }
        calcProjection() {
            var _a;
            const { layout, layoutId } = this.options;
            /**
             * If this section of the tree isn't animating we can
             * delete our target sources for the following frame.
             */
            this.isTreeAnimating = Boolean(((_a = this.parent) === null || _a === void 0 ? void 0 : _a.isTreeAnimating) ||
                this.currentAnimation ||
                this.pendingAnimation);
            if (!this.isTreeAnimating) {
                this.targetDelta = this.relativeTarget = undefined;
            }
            if (!this.layout || !(layout || layoutId))
                return;
            const lead = this.getLead();
            /**
             * Reset the corrected box with the latest values from box, as we're then going
             * to perform mutative operations on it.
             */
            copyBoxInto(this.layoutCorrected, this.layout.actual);
            /**
             * Apply all the parent deltas to this box to produce the corrected box. This
             * is the layout box, as it will appear on screen as a result of the transforms of its parents.
             */
            applyTreeDeltas(this.layoutCorrected, this.treeScale, this.path, Boolean(this.resumingFrom) || this !== lead);
            const { target } = lead;
            if (!target)
                return;
            if (!this.projectionDelta) {
                this.projectionDelta = createDelta();
                this.projectionDeltaWithTransform = createDelta();
            }
            const prevTreeScaleX = this.treeScale.x;
            const prevTreeScaleY = this.treeScale.y;
            const prevProjectionTransform = this.projectionTransform;
            /**
             * Update the delta between the corrected box and the target box before user-set transforms were applied.
             * This will allow us to calculate the corrected borderRadius and boxShadow to compensate
             * for our layout reprojection, but still allow them to be scaled correctly by the user.
             * It might be that to simplify this we may want to accept that user-set scale is also corrected
             * and we wouldn't have to keep and calc both deltas, OR we could support a user setting
             * to allow people to choose whether these styles are corrected based on just the
             * layout reprojection or the final bounding box.
             */
            calcBoxDelta(this.projectionDelta, this.layoutCorrected, target, this.latestValues);
            this.projectionTransform = buildProjectionTransform(this.projectionDelta, this.treeScale);
            if (this.projectionTransform !== prevProjectionTransform ||
                this.treeScale.x !== prevTreeScaleX ||
                this.treeScale.y !== prevTreeScaleY) {
                this.hasProjected = true;
                this.scheduleRender();
                this.notifyListeners("projectionUpdate", target);
            }
        }
        hide() {
            this.isVisible = false;
            // TODO: Schedule render
        }
        show() {
            this.isVisible = true;
            // TODO: Schedule render
        }
        scheduleRender(notifyAll = true) {
            var _a, _b, _c;
            (_b = (_a = this.options).scheduleRender) === null || _b === void 0 ? void 0 : _b.call(_a);
            notifyAll && ((_c = this.getStack()) === null || _c === void 0 ? void 0 : _c.scheduleRender());
            if (this.resumingFrom && !this.resumingFrom.instance) {
                this.resumingFrom = undefined;
            }
        }
        setAnimationOrigin(delta, hasOnlyRelativeTargetChanged = false) {
            var _a;
            const snapshot = this.snapshot;
            const snapshotLatestValues = (snapshot === null || snapshot === void 0 ? void 0 : snapshot.latestValues) || {};
            const mixedValues = Object.assign({}, this.latestValues);
            const targetDelta = createDelta();
            this.relativeTarget = this.relativeTargetOrigin = undefined;
            this.attemptToResolveRelativeTarget = !hasOnlyRelativeTargetChanged;
            const relativeLayout = createBox();
            const isSharedLayoutAnimation = snapshot === null || snapshot === void 0 ? void 0 : snapshot.isShared;
            const isOnlyMember = (((_a = this.getStack()) === null || _a === void 0 ? void 0 : _a.members.length) || 0) <= 1;
            const shouldCrossfadeOpacity = Boolean(isSharedLayoutAnimation &&
                !isOnlyMember &&
                this.options.crossfade === true &&
                !this.path.some(hasOpacityCrossfade));
            this.animationProgress = 0;
            this.mixTargetDelta = (latest) => {
                var _a;
                const progress = latest / 1000;
                mixAxisDelta(targetDelta.x, delta.x, progress);
                mixAxisDelta(targetDelta.y, delta.y, progress);
                this.setTargetDelta(targetDelta);
                if (this.relativeTarget &&
                    this.relativeTargetOrigin &&
                    this.layout &&
                    ((_a = this.relativeParent) === null || _a === void 0 ? void 0 : _a.layout)) {
                    calcRelativePosition(relativeLayout, this.layout.actual, this.relativeParent.layout.actual);
                    mixBox(this.relativeTarget, this.relativeTargetOrigin, relativeLayout, progress);
                }
                if (isSharedLayoutAnimation) {
                    this.animationValues = mixedValues;
                    mixValues(mixedValues, snapshotLatestValues, this.latestValues, progress, shouldCrossfadeOpacity, isOnlyMember);
                }
                this.root.scheduleUpdateProjection();
                this.scheduleRender();
                this.animationProgress = progress;
            };
            this.mixTargetDelta(0);
        }
        startAnimation(options) {
            var _a, _b;
            this.notifyListeners("animationStart");
            (_a = this.currentAnimation) === null || _a === void 0 ? void 0 : _a.stop();
            if (this.resumingFrom) {
                (_b = this.resumingFrom.currentAnimation) === null || _b === void 0 ? void 0 : _b.stop();
            }
            if (this.pendingAnimation) {
                cancelSync.update(this.pendingAnimation);
                this.pendingAnimation = undefined;
            }
            /**
             * Start the animation in the next frame to have a frame with progress 0,
             * where the target is the same as when the animation started, so we can
             * calculate the relative positions correctly for instant transitions.
             */
            this.pendingAnimation = sync.update(() => {
                globalProjectionState.hasAnimatedSinceResize = true;
                this.currentAnimation = animate(0, animationTarget, Object.assign(Object.assign({}, options), { onUpdate: (latest) => {
                        var _a;
                        this.mixTargetDelta(latest);
                        (_a = options.onUpdate) === null || _a === void 0 ? void 0 : _a.call(options, latest);
                    }, onComplete: () => {
                        var _a;
                        (_a = options.onComplete) === null || _a === void 0 ? void 0 : _a.call(options);
                        this.completeAnimation();
                    } }));
                if (this.resumingFrom) {
                    this.resumingFrom.currentAnimation = this.currentAnimation;
                }
                this.pendingAnimation = undefined;
            });
        }
        completeAnimation() {
            var _a;
            if (this.resumingFrom) {
                this.resumingFrom.currentAnimation = undefined;
                this.resumingFrom.preserveOpacity = undefined;
            }
            (_a = this.getStack()) === null || _a === void 0 ? void 0 : _a.exitAnimationComplete();
            this.resumingFrom =
                this.currentAnimation =
                    this.animationValues =
                        undefined;
            this.notifyListeners("animationComplete");
        }
        finishAnimation() {
            var _a;
            if (this.currentAnimation) {
                (_a = this.mixTargetDelta) === null || _a === void 0 ? void 0 : _a.call(this, animationTarget);
                this.currentAnimation.stop();
            }
            this.completeAnimation();
        }
        applyTransformsToTarget() {
            const { targetWithTransforms, target, layout, latestValues } = this.getLead();
            if (!targetWithTransforms || !target || !layout)
                return;
            copyBoxInto(targetWithTransforms, target);
            /**
             * Apply the latest user-set transforms to the targetBox to produce the targetBoxFinal.
             * This is the final box that we will then project into by calculating a transform delta and
             * applying it to the corrected box.
             */
            transformBox(targetWithTransforms, latestValues);
            /**
             * Update the delta between the corrected box and the final target box, after
             * user-set transforms are applied to it. This will be used by the renderer to
             * create a transform style that will reproject the element from its actual layout
             * into the desired bounding box.
             */
            calcBoxDelta(this.projectionDeltaWithTransform, this.layoutCorrected, targetWithTransforms, latestValues);
        }
        registerSharedNode(layoutId, node) {
            var _a, _b, _c;
            if (!this.sharedNodes.has(layoutId)) {
                this.sharedNodes.set(layoutId, new NodeStack());
            }
            const stack = this.sharedNodes.get(layoutId);
            stack.add(node);
            node.promote({
                transition: (_a = node.options.initialPromotionConfig) === null || _a === void 0 ? void 0 : _a.transition,
                preserveFollowOpacity: (_c = (_b = node.options.initialPromotionConfig) === null || _b === void 0 ? void 0 : _b.shouldPreserveFollowOpacity) === null || _c === void 0 ? void 0 : _c.call(_b, node),
            });
        }
        isLead() {
            const stack = this.getStack();
            return stack ? stack.lead === this : true;
        }
        getLead() {
            var _a;
            const { layoutId } = this.options;
            return layoutId ? ((_a = this.getStack()) === null || _a === void 0 ? void 0 : _a.lead) || this : this;
        }
        getPrevLead() {
            var _a;
            const { layoutId } = this.options;
            return layoutId ? (_a = this.getStack()) === null || _a === void 0 ? void 0 : _a.prevLead : undefined;
        }
        getStack() {
            const { layoutId } = this.options;
            if (layoutId)
                return this.root.sharedNodes.get(layoutId);
        }
        promote({ needsReset, transition, preserveFollowOpacity, } = {}) {
            const stack = this.getStack();
            if (stack)
                stack.promote(this, preserveFollowOpacity);
            if (needsReset) {
                this.projectionDelta = undefined;
                this.needsReset = true;
            }
            if (transition)
                this.setOptions({ transition });
        }
        relegate() {
            const stack = this.getStack();
            if (stack) {
                return stack.relegate(this);
            }
            else {
                return false;
            }
        }
        resetRotation() {
            const { visualElement } = this.options;
            if (!visualElement)
                return;
            // If there's no detected rotation values, we can early return without a forced render.
            let hasRotate = false;
            // Keep a record of all the values we've reset
            const resetValues = {};
            // Check the rotate value of all axes and reset to 0
            for (let i = 0; i < transformAxes.length; i++) {
                const axis = transformAxes[i];
                const key = "rotate" + axis;
                // If this rotation doesn't exist as a motion value, then we don't
                // need to reset it
                if (!visualElement.getStaticValue(key)) {
                    continue;
                }
                hasRotate = true;
                // Record the rotation and then temporarily set it to 0
                resetValues[key] = visualElement.getStaticValue(key);
                visualElement.setStaticValue(key, 0);
            }
            // If there's no rotation values, we don't need to do any more.
            if (!hasRotate)
                return;
            // Force a render of this element to apply the transform with all rotations
            // set to 0.
            visualElement === null || visualElement === void 0 ? void 0 : visualElement.syncRender();
            // Put back all the values we reset
            for (const key in resetValues) {
                visualElement.setStaticValue(key, resetValues[key]);
            }
            // Schedule a render for the next frame. This ensures we won't visually
            // see the element with the reset rotate value applied.
            visualElement.scheduleRender();
        }
        getProjectionStyles(styleProp = {}) {
            var _a, _b, _c, _d, _e, _f;
            // TODO: Return lifecycle-persistent object
            const styles = {};
            if (!this.instance || this.isSVG)
                return styles;
            if (!this.isVisible) {
                return { visibility: "hidden" };
            }
            else {
                styles.visibility = "";
            }
            const transformTemplate = (_a = this.options.visualElement) === null || _a === void 0 ? void 0 : _a.getProps().transformTemplate;
            if (this.needsReset) {
                this.needsReset = false;
                styles.opacity = "";
                styles.pointerEvents =
                    resolveMotionValue(styleProp.pointerEvents) || "";
                styles.transform = transformTemplate
                    ? transformTemplate(this.latestValues, "")
                    : "none";
                return styles;
            }
            const lead = this.getLead();
            if (!this.projectionDelta || !this.layout || !lead.target) {
                const emptyStyles = {};
                if (this.options.layoutId) {
                    emptyStyles.opacity = (_b = this.latestValues.opacity) !== null && _b !== void 0 ? _b : 1;
                    emptyStyles.pointerEvents =
                        resolveMotionValue(styleProp.pointerEvents) || "";
                }
                if (this.hasProjected && !hasTransform(this.latestValues)) {
                    emptyStyles.transform = transformTemplate
                        ? transformTemplate({}, "")
                        : "none";
                    this.hasProjected = false;
                }
                return emptyStyles;
            }
            const valuesToRender = lead.animationValues || lead.latestValues;
            this.applyTransformsToTarget();
            styles.transform = buildProjectionTransform(this.projectionDeltaWithTransform, this.treeScale, valuesToRender);
            if (transformTemplate) {
                styles.transform = transformTemplate(valuesToRender, styles.transform);
            }
            const { x, y } = this.projectionDelta;
            styles.transformOrigin = `${x.origin * 100}% ${y.origin * 100}% 0`;
            if (lead.animationValues) {
                /**
                 * If the lead component is animating, assign this either the entering/leaving
                 * opacity
                 */
                styles.opacity =
                    lead === this
                        ? (_d = (_c = valuesToRender.opacity) !== null && _c !== void 0 ? _c : this.latestValues.opacity) !== null && _d !== void 0 ? _d : 1
                        : this.preserveOpacity
                            ? this.latestValues.opacity
                            : valuesToRender.opacityExit;
            }
            else {
                /**
                 * Or we're not animating at all, set the lead component to its actual
                 * opacity and other components to hidden.
                 */
                styles.opacity =
                    lead === this
                        ? (_e = valuesToRender.opacity) !== null && _e !== void 0 ? _e : ""
                        : (_f = valuesToRender.opacityExit) !== null && _f !== void 0 ? _f : 0;
            }
            /**
             * Apply scale correction
             */
            for (const key in scaleCorrectors) {
                if (valuesToRender[key] === undefined)
                    continue;
                const { correct, applyTo } = scaleCorrectors[key];
                const corrected = correct(valuesToRender[key], lead);
                if (applyTo) {
                    const num = applyTo.length;
                    for (let i = 0; i < num; i++) {
                        styles[applyTo[i]] = corrected;
                    }
                }
                else {
                    styles[key] = corrected;
                }
            }
            /**
             * Disable pointer events on follow components. This is to ensure
             * that if a follow component covers a lead component it doesn't block
             * pointer events on the lead.
             */
            if (this.options.layoutId) {
                styles.pointerEvents =
                    lead === this
                        ? resolveMotionValue(styleProp.pointerEvents) || ""
                        : "none";
            }
            return styles;
        }
        clearSnapshot() {
            this.resumeFrom = this.snapshot = undefined;
        }
        // Only run on root
        resetTree() {
            this.root.nodes.forEach((node) => { var _a; return (_a = node.currentAnimation) === null || _a === void 0 ? void 0 : _a.stop(); });
            this.root.nodes.forEach(clearMeasurements);
            this.root.sharedNodes.clear();
        }
    };
}
function updateLayout(node) {
    node.updateLayout();
}
function notifyLayoutUpdate(node) {
    var _a, _b, _c, _d;
    const snapshot = (_b = (_a = node.resumeFrom) === null || _a === void 0 ? void 0 : _a.snapshot) !== null && _b !== void 0 ? _b : node.snapshot;
    if (node.isLead() &&
        node.layout &&
        snapshot &&
        node.hasListeners("didUpdate")) {
        const { actual: layout, measured: measuredLayout } = node.layout;
        // TODO Maybe we want to also resize the layout snapshot so we don't trigger
        // animations for instance if layout="size" and an element has only changed position
        if (node.options.animationType === "size") {
            eachAxis((axis) => {
                const axisSnapshot = snapshot.isShared
                    ? snapshot.measured[axis]
                    : snapshot.layout[axis];
                const length = calcLength(axisSnapshot);
                axisSnapshot.min = layout[axis].min;
                axisSnapshot.max = axisSnapshot.min + length;
            });
        }
        else if (node.options.animationType === "position") {
            eachAxis((axis) => {
                const axisSnapshot = snapshot.isShared
                    ? snapshot.measured[axis]
                    : snapshot.layout[axis];
                const length = calcLength(layout[axis]);
                axisSnapshot.max = axisSnapshot.min + length;
            });
        }
        const layoutDelta = createDelta();
        calcBoxDelta(layoutDelta, layout, snapshot.layout);
        const visualDelta = createDelta();
        if (snapshot.isShared) {
            calcBoxDelta(visualDelta, node.applyTransform(measuredLayout, true), snapshot.measured);
        }
        else {
            calcBoxDelta(visualDelta, layout, snapshot.layout);
        }
        const hasLayoutChanged = !isDeltaZero(layoutDelta);
        let hasRelativeTargetChanged = false;
        if (!node.resumeFrom) {
            node.relativeParent = node.getClosestProjectingParent();
            /**
             * If the relativeParent is itself resuming from a different element then
             * the relative snapshot is not relavent
             */
            if (node.relativeParent && !node.relativeParent.resumeFrom) {
                const { snapshot: parentSnapshot, layout: parentLayout } = node.relativeParent;
                if (parentSnapshot && parentLayout) {
                    const relativeSnapshot = createBox();
                    calcRelativePosition(relativeSnapshot, snapshot.layout, parentSnapshot.layout);
                    const relativeLayout = createBox();
                    calcRelativePosition(relativeLayout, layout, parentLayout.actual);
                    if (!boxEquals(relativeSnapshot, relativeLayout)) {
                        hasRelativeTargetChanged = true;
                    }
                }
            }
        }
        node.notifyListeners("didUpdate", {
            layout,
            snapshot,
            delta: visualDelta,
            layoutDelta,
            hasLayoutChanged,
            hasRelativeTargetChanged,
        });
    }
    else if (node.isLead()) {
        (_d = (_c = node.options).onExitComplete) === null || _d === void 0 ? void 0 : _d.call(_c);
    }
    /**
     * Clearing transition
     * TODO: Investigate why this transition is being passed in as {type: false } from Framer
     * and why we need it at all
     */
    node.options.transition = undefined;
}
function clearSnapshot(node) {
    node.clearSnapshot();
}
function clearMeasurements(node) {
    node.clearMeasurements();
}
function resetTransformStyle(node) {
    const { visualElement } = node.options;
    if (visualElement === null || visualElement === void 0 ? void 0 : visualElement.getProps().onBeforeLayoutMeasure) {
        visualElement.notifyBeforeLayoutMeasure();
    }
    node.resetTransform();
}
function finishAnimation(node) {
    node.finishAnimation();
    node.targetDelta = node.relativeTarget = node.target = undefined;
}
function resolveTargetDelta(node) {
    node.resolveTargetDelta();
}
function calcProjection(node) {
    node.calcProjection();
}
function resetRotation(node) {
    node.resetRotation();
}
function removeLeadSnapshots(stack) {
    stack.removeLeadSnapshot();
}
function mixAxisDelta(output, delta, p) {
    output.translate = mix(delta.translate, 0, p);
    output.scale = mix(delta.scale, 1, p);
    output.origin = delta.origin;
    output.originPoint = delta.originPoint;
}
function mixAxis(output, from, to, p) {
    output.min = mix(from.min, to.min, p);
    output.max = mix(from.max, to.max, p);
}
function mixBox(output, from, to, p) {
    mixAxis(output.x, from.x, to.x, p);
    mixAxis(output.y, from.y, to.y, p);
}
function hasOpacityCrossfade(node) {
    return (node.animationValues && node.animationValues.opacityExit !== undefined);
}
const defaultLayoutTransition = {
    duration: 0.45,
    ease: [0.4, 0, 0.1, 1],
};
function mountNodeEarly(node, id) {
    /**
     * Rather than searching the DOM from document we can search the
     * path for the deepest mounted ancestor and search from there
     */
    let searchNode = node.root;
    for (let i = node.path.length - 1; i >= 0; i--) {
        if (Boolean(node.path[i].instance)) {
            searchNode = node.path[i];
            break;
        }
    }
    const searchElement = searchNode && searchNode !== node.root ? searchNode.instance : document;
    const element = searchElement.querySelector(`[data-projection-id="${id}"]`);
    if (element)
        node.mount(element, true);
}
function roundAxis(axis) {
    axis.min = Math.round(axis.min);
    axis.max = Math.round(axis.max);
}
function roundBox(box) {
    roundAxis(box.x);
    roundAxis(box.y);
}

export { createProjectionNode, mixAxis, mixAxisDelta, mixBox };
