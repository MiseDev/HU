import { __rest } from 'tslib';
import sync, { cancelSync } from 'framesync';
import { motionValue } from '../value/index.mjs';
import { isWillChangeMotionValue } from '../value/use-will-change/is.mjs';
import { isMotionValue } from '../value/utils/is-motion-value.mjs';
import { variantPriorityOrder } from './utils/animation-state.mjs';
import { createLifecycles } from './utils/lifecycles.mjs';
import { updateMotionValuesFromProps } from './utils/motion-values.mjs';
import { checkIfControllingVariants, checkIfVariantNode, isVariantLabel } from './utils/variants.mjs';

const visualElement = ({ treeType = "", build, getBaseTarget, makeTargetAnimatable, measureViewportBox, render: renderInstance, readValueFromInstance, removeValueFromRenderState, sortNodePosition, scrapeMotionValuesFromProps, }) => ({ parent, props, presenceId, blockInitialAnimation, visualState, shouldReduceMotion, }, options = {}) => {
    let isMounted = false;
    const { latestValues, renderState } = visualState;
    /**
     * The instance of the render-specific node that will be hydrated by the
     * exposed React ref. So for example, this visual element can host a
     * HTMLElement, plain object, or Three.js object. The functions provided
     * in VisualElementConfig allow us to interface with this instance.
     */
    let instance;
    /**
     * Manages the subscriptions for a visual element's lifecycle, for instance
     * onRender
     */
    const lifecycles = createLifecycles();
    /**
     * A map of all motion values attached to this visual element. Motion
     * values are source of truth for any given animated value. A motion
     * value might be provided externally by the component via props.
     */
    const values = new Map();
    /**
     * A map of every subscription that binds the provided or generated
     * motion values onChange listeners to this visual element.
     */
    const valueSubscriptions = new Map();
    /**
     * A reference to the previously-provided motion values as returned
     * from scrapeMotionValuesFromProps. We use the keys in here to determine
     * if any motion values need to be removed after props are updated.
     */
    let prevMotionValues = {};
    /**
     * When values are removed from all animation props we need to search
     * for a fallback value to animate to. These values are tracked in baseTarget.
     */
    const baseTarget = Object.assign({}, latestValues);
    // Internal methods ========================
    /**
     * On mount, this will be hydrated with a callback to disconnect
     * this visual element from its parent on unmount.
     */
    let removeFromVariantTree;
    /**
     * Render the element with the latest styles outside of the React
     * render lifecycle
     */
    function render() {
        if (!instance || !isMounted)
            return;
        triggerBuild();
        renderInstance(instance, renderState, props.style, element.projection);
    }
    function triggerBuild() {
        build(element, renderState, latestValues, options, props);
    }
    function update() {
        lifecycles.notifyUpdate(latestValues);
    }
    /**
     *
     */
    function bindToMotionValue(key, value) {
        const removeOnChange = value.onChange((latestValue) => {
            latestValues[key] = latestValue;
            props.onUpdate && sync.update(update, false, true);
        });
        const removeOnRenderRequest = value.onRenderRequest(element.scheduleRender);
        valueSubscriptions.set(key, () => {
            removeOnChange();
            removeOnRenderRequest();
        });
    }
    /**
     * Any motion values that are provided to the element when created
     * aren't yet bound to the element, as this would technically be impure.
     * However, we iterate through the motion values and set them to the
     * initial values for this component.
     *
     * TODO: This is impure and we should look at changing this to run on mount.
     * Doing so will break some tests but this isn't neccessarily a breaking change,
     * more a reflection of the test.
     */
    const _a = scrapeMotionValuesFromProps(props), { willChange } = _a, initialMotionValues = __rest(_a, ["willChange"]);
    for (const key in initialMotionValues) {
        const value = initialMotionValues[key];
        if (latestValues[key] !== undefined && isMotionValue(value)) {
            value.set(latestValues[key], false);
            if (isWillChangeMotionValue(willChange)) {
                willChange.add(key);
            }
        }
    }
    /**
     * Determine what role this visual element should take in the variant tree.
     */
    const isControllingVariants = checkIfControllingVariants(props);
    const isVariantNode = checkIfVariantNode(props);
    const element = Object.assign(Object.assign({ treeType, 
        /**
         * This is a mirror of the internal instance prop, which keeps
         * VisualElement type-compatible with React's RefObject.
         */
        current: null, 
        /**
         * The depth of this visual element within the visual element tree.
         */
        depth: parent ? parent.depth + 1 : 0, parent, children: new Set(), 
        /**
         *
         */
        presenceId,
        shouldReduceMotion, 
        /**
         * If this component is part of the variant tree, it should track
         * any children that are also part of the tree. This is essentially
         * a shadow tree to simplify logic around how to stagger over children.
         */
        variantChildren: isVariantNode ? new Set() : undefined, 
        /**
         * Whether this instance is visible. This can be changed imperatively
         * by the projection tree, is analogous to CSS's visibility in that
         * hidden elements should take up layout, and needs enacting by the configured
         * render function.
         */
        isVisible: undefined, 
        /**
         * Normally, if a component is controlled by a parent's variants, it can
         * rely on that ancestor to trigger animations further down the tree.
         * However, if a component is created after its parent is mounted, the parent
         * won't trigger that mount animation so the child needs to.
         *
         * TODO: This might be better replaced with a method isParentMounted
         */
        manuallyAnimateOnMount: Boolean(parent === null || parent === void 0 ? void 0 : parent.isMounted()), 
        /**
         * This can be set by AnimatePresence to force components that mount
         * at the same time as it to mount as if they have initial={false} set.
         */
        blockInitialAnimation, 
        /**
         * Determine whether this component has mounted yet. This is mostly used
         * by variant children to determine whether they need to trigger their
         * own animations on mount.
         */
        isMounted: () => Boolean(instance), mount(newInstance) {
            isMounted = true;
            instance = element.current = newInstance;
            if (element.projection) {
                element.projection.mount(newInstance);
            }
            if (isVariantNode && parent && !isControllingVariants) {
                removeFromVariantTree = parent === null || parent === void 0 ? void 0 : parent.addVariantChild(element);
            }
            values.forEach((value, key) => bindToMotionValue(key, value));
            parent === null || parent === void 0 ? void 0 : parent.children.add(element);
            element.setProps(props);
        },
        /**
         *
         */
        unmount() {
            var _a;
            (_a = element.projection) === null || _a === void 0 ? void 0 : _a.unmount();
            cancelSync.update(update);
            cancelSync.render(render);
            valueSubscriptions.forEach((remove) => remove());
            removeFromVariantTree === null || removeFromVariantTree === void 0 ? void 0 : removeFromVariantTree();
            parent === null || parent === void 0 ? void 0 : parent.children.delete(element);
            lifecycles.clearAllListeners();
            instance = undefined;
            isMounted = false;
        },
        /**
         * Add a child visual element to our set of children.
         */
        addVariantChild(child) {
            var _a;
            const closestVariantNode = element.getClosestVariantNode();
            if (closestVariantNode) {
                (_a = closestVariantNode.variantChildren) === null || _a === void 0 ? void 0 : _a.add(child);
                return () => closestVariantNode.variantChildren.delete(child);
            }
        },
        sortNodePosition(other) {
            /**
             * If these nodes aren't even of the same type we can't compare their depth.
             */
            if (!sortNodePosition || treeType !== other.treeType)
                return 0;
            return sortNodePosition(element.getInstance(), other.getInstance());
        }, 
        /**
         * Returns the closest variant node in the tree starting from
         * this visual element.
         */
        getClosestVariantNode: () => isVariantNode ? element : parent === null || parent === void 0 ? void 0 : parent.getClosestVariantNode(), 
        /**
         * Expose the latest layoutId prop.
         */
        getLayoutId: () => props.layoutId, 
        /**
         * Returns the current instance.
         */
        getInstance: () => instance, 
        /**
         * Get/set the latest static values.
         */
        getStaticValue: (key) => latestValues[key], setStaticValue: (key, value) => (latestValues[key] = value), 
        /**
         * Returns the latest motion value state. Currently only used to take
         * a snapshot of the visual element - perhaps this can return the whole
         * visual state
         */
        getLatestValues: () => latestValues, 
        /**
         * Set the visiblity of the visual element. If it's changed, schedule
         * a render to reflect these changes.
         */
        setVisibility(visibility) {
            if (element.isVisible === visibility)
                return;
            element.isVisible = visibility;
            element.scheduleRender();
        },
        /**
         * Make a target animatable by Popmotion. For instance, if we're
         * trying to animate width from 100px to 100vw we need to measure 100vw
         * in pixels to determine what we really need to animate to. This is also
         * pluggable to support Framer's custom value types like Color,
         * and CSS variables.
         */
        makeTargetAnimatable(target, canMutate = true) {
            return makeTargetAnimatable(element, target, props, canMutate);
        },
        /**
         * Measure the current viewport box with or without transforms.
         * Only measures axis-aligned boxes, rotate and skew must be manually
         * removed with a re-render to work.
         */
        measureViewportBox() {
            return measureViewportBox(instance, props);
        },
        // Motion values ========================
        /**
         * Add a motion value and bind it to this visual element.
         */
        addValue(key, value) {
            // Remove existing value if it exists
            if (element.hasValue(key))
                element.removeValue(key);
            values.set(key, value);
            latestValues[key] = value.get();
            bindToMotionValue(key, value);
        },
        /**
         * Remove a motion value and unbind any active subscriptions.
         */
        removeValue(key) {
            var _a;
            values.delete(key);
            (_a = valueSubscriptions.get(key)) === null || _a === void 0 ? void 0 : _a();
            valueSubscriptions.delete(key);
            delete latestValues[key];
            removeValueFromRenderState(key, renderState);
        }, 
        /**
         * Check whether we have a motion value for this key
         */
        hasValue: (key) => values.has(key), 
        /**
         * Get a motion value for this key. If called with a default
         * value, we'll create one if none exists.
         */
        getValue(key, defaultValue) {
            let value = values.get(key);
            if (value === undefined && defaultValue !== undefined) {
                value = motionValue(defaultValue);
                element.addValue(key, value);
            }
            return value;
        }, 
        /**
         * Iterate over our motion values.
         */
        forEachValue: (callback) => values.forEach(callback), 
        /**
         * If we're trying to animate to a previously unencountered value,
         * we need to check for it in our state and as a last resort read it
         * directly from the instance (which might have performance implications).
         */
        readValue: (key) => {
            var _a;
            return (_a = latestValues[key]) !== null && _a !== void 0 ? _a : readValueFromInstance(instance, key, options);
        }, 
        /**
         * Set the base target to later animate back to. This is currently
         * only hydrated on creation and when we first read a value.
         */
        setBaseTarget(key, value) {
            baseTarget[key] = value;
        },
        /**
         * Find the base target for a value thats been removed from all animation
         * props.
         */
        getBaseTarget(key) {
            if (getBaseTarget) {
                const target = getBaseTarget(props, key);
                if (target !== undefined && !isMotionValue(target))
                    return target;
            }
            return baseTarget[key];
        } }, lifecycles), { 
        /**
         * Build the renderer state based on the latest visual state.
         */
        build() {
            triggerBuild();
            return renderState;
        },
        /**
         * Schedule a render on the next animation frame.
         */
        scheduleRender() {
            sync.render(render, false, true);
        }, 
        /**
         * Synchronously fire render. It's prefered that we batch renders but
         * in many circumstances, like layout measurement, we need to run this
         * synchronously. However in those instances other measures should be taken
         * to batch reads/writes.
         */
        syncRender: render, 
        /**
         * Update the provided props. Ensure any newly-added motion values are
         * added to our map, old ones removed, and listeners updated.
         */
        setProps(newProps) {
            if (newProps.transformTemplate || props.transformTemplate) {
                element.scheduleRender();
            }
            props = newProps;
            lifecycles.updatePropListeners(newProps);
            prevMotionValues = updateMotionValuesFromProps(element, scrapeMotionValuesFromProps(props), prevMotionValues);
        }, getProps: () => props, 
        // Variants ==============================
        /**
         * Returns the variant definition with a given name.
         */
        getVariant: (name) => { var _a; return (_a = props.variants) === null || _a === void 0 ? void 0 : _a[name]; }, 
        /**
         * Returns the defined default transition on this component.
         */
        getDefaultTransition: () => props.transition, getTransformPagePoint: () => {
            return props.transformPagePoint;
        }, 
        /**
         * Used by child variant nodes to get the closest ancestor variant props.
         */
        getVariantContext(startAtParent = false) {
            if (startAtParent)
                return parent === null || parent === void 0 ? void 0 : parent.getVariantContext();
            if (!isControllingVariants) {
                const context = (parent === null || parent === void 0 ? void 0 : parent.getVariantContext()) || {};
                if (props.initial !== undefined) {
                    context.initial = props.initial;
                }
                return context;
            }
            const context = {};
            for (let i = 0; i < numVariantProps; i++) {
                const name = variantProps[i];
                const prop = props[name];
                if (isVariantLabel(prop) || prop === false) {
                    context[name] = prop;
                }
            }
            return context;
        } });
    return element;
};
const variantProps = ["initial", ...variantPriorityOrder];
const numVariantProps = variantProps.length;

export { visualElement };
