'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var React = require('react');
var heyListen = require('hey-listen');
var styleValueTypes = require('style-value-types');
var tslib = require('tslib');
var popmotion = require('popmotion');
var sync = require('framesync');
var dom = require('@motionone/dom');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var React__namespace = /*#__PURE__*/_interopNamespace(React);
var React__default = /*#__PURE__*/_interopDefaultLegacy(React);
var sync__default = /*#__PURE__*/_interopDefaultLegacy(sync);

/**
 * Browser-safe usage of process
 */
const defaultEnvironment = "production";
const env = typeof process === "undefined" || process.env === undefined
    ? defaultEnvironment
    : process.env.NODE_ENV || defaultEnvironment;

const createDefinition = (propNames) => ({
    isEnabled: (props) => propNames.some((name) => !!props[name]),
});
const featureDefinitions = {
    measureLayout: createDefinition(["layout", "layoutId", "drag"]),
    animation: createDefinition([
        "animate",
        "exit",
        "variants",
        "whileHover",
        "whileTap",
        "whileFocus",
        "whileDrag",
        "whileInView",
    ]),
    exit: createDefinition(["exit"]),
    drag: createDefinition(["drag", "dragControls"]),
    focus: createDefinition(["whileFocus"]),
    hover: createDefinition(["whileHover", "onHoverStart", "onHoverEnd"]),
    tap: createDefinition(["whileTap", "onTap", "onTapStart", "onTapCancel"]),
    pan: createDefinition([
        "onPan",
        "onPanStart",
        "onPanSessionStart",
        "onPanEnd",
    ]),
    inView: createDefinition([
        "whileInView",
        "onViewportEnter",
        "onViewportLeave",
    ]),
};
function loadFeatures(features) {
    for (const key in features) {
        if (features[key] === null)
            continue;
        if (key === "projectionNodeConstructor") {
            featureDefinitions.projectionNodeConstructor = features[key];
        }
        else {
            featureDefinitions[key].Component = features[key];
        }
    }
}

const LazyContext = React.createContext({ strict: false });

const featureNames = Object.keys(featureDefinitions);
const numFeatures = featureNames.length;
/**
 * Load features via renderless components based on the provided MotionProps.
 */
function useFeatures(props, visualElement, preloadedFeatures) {
    const features = [];
    const lazyContext = React.useContext(LazyContext);
    if (!visualElement)
        return null;
    /**
     * If we're in development mode, check to make sure we're not rendering a motion component
     * as a child of LazyMotion, as this will break the file-size benefits of using it.
     */
    if (env !== "production" && preloadedFeatures && lazyContext.strict) {
        heyListen.invariant(false, "You have rendered a `motion` component within a `LazyMotion` component. This will break tree shaking. Import and render a `m` component instead.");
    }
    for (let i = 0; i < numFeatures; i++) {
        const name = featureNames[i];
        const { isEnabled, Component } = featureDefinitions[name];
        /**
         * It might be possible in the future to use this moment to
         * dynamically request functionality. In initial tests this
         * was producing a lot of duplication amongst bundles.
         */
        if (isEnabled(props) && Component) {
            features.push(React__namespace.createElement(Component, Object.assign({ key: name }, props, { visualElement: visualElement })));
        }
    }
    return features;
}

/**
 * @public
 */
const MotionConfigContext = React.createContext({
    transformPagePoint: (p) => p,
    isStatic: false,
    reducedMotion: "never",
});

const MotionContext = React.createContext({});
function useVisualElementContext() {
    return React.useContext(MotionContext).visualElement;
}

/**
 * @public
 */
const PresenceContext = React.createContext(null);

const isBrowser = typeof document !== "undefined";

const useIsomorphicLayoutEffect = isBrowser ? React.useLayoutEffect : React.useEffect;

// Does this device prefer reduced motion? Returns `null` server-side.
const prefersReducedMotion = { current: null };
let hasDetected = false;
function initPrefersReducedMotion() {
    hasDetected = true;
    if (!isBrowser)
        return;
    if (window.matchMedia) {
        const motionMediaQuery = window.matchMedia("(prefers-reduced-motion)");
        const setReducedMotionPreferences = () => (prefersReducedMotion.current = motionMediaQuery.matches);
        motionMediaQuery.addListener(setReducedMotionPreferences);
        setReducedMotionPreferences();
    }
    else {
        prefersReducedMotion.current = false;
    }
}
/**
 * A hook that returns `true` if we should be using reduced motion based on the current device's Reduced Motion setting.
 *
 * This can be used to implement changes to your UI based on Reduced Motion. For instance, replacing motion-sickness inducing
 * `x`/`y` animations with `opacity`, disabling the autoplay of background videos, or turning off parallax motion.
 *
 * It will actively respond to changes and re-render your components with the latest setting.
 *
 * ```jsx
 * export function Sidebar({ isOpen }) {
 *   const shouldReduceMotion = useReducedMotion()
 *   const closedX = shouldReduceMotion ? 0 : "-100%"
 *
 *   return (
 *     <motion.div animate={{
 *       opacity: isOpen ? 1 : 0,
 *       x: isOpen ? 0 : closedX
 *     }} />
 *   )
 * }
 * ```
 *
 * @return boolean
 *
 * @public
 */
function useReducedMotion() {
    /**
     * Lazy initialisation of prefersReducedMotion
     */
    !hasDetected && initPrefersReducedMotion();
    const [shouldReduceMotion] = React.useState(prefersReducedMotion.current);
    /**
     * TODO See if people miss automatically updating shouldReduceMotion setting
     */
    return shouldReduceMotion;
}
function useReducedMotionConfig() {
    const reducedMotionPreference = useReducedMotion();
    const { reducedMotion } = React.useContext(MotionConfigContext);
    if (reducedMotion === "never") {
        return false;
    }
    else if (reducedMotion === "always") {
        return true;
    }
    else {
        return reducedMotionPreference;
    }
}

function useVisualElement(Component, visualState, props, createVisualElement) {
    const lazyContext = React.useContext(LazyContext);
    const parent = useVisualElementContext();
    const presenceContext = React.useContext(PresenceContext);
    const shouldReduceMotion = useReducedMotionConfig();
    const visualElementRef = React.useRef(undefined);
    /**
     * If we haven't preloaded a renderer, check to see if we have one lazy-loaded
     */
    if (!createVisualElement)
        createVisualElement = lazyContext.renderer;
    if (!visualElementRef.current && createVisualElement) {
        visualElementRef.current = createVisualElement(Component, {
            visualState,
            parent,
            props,
            presenceId: presenceContext === null || presenceContext === void 0 ? void 0 : presenceContext.id,
            blockInitialAnimation: (presenceContext === null || presenceContext === void 0 ? void 0 : presenceContext.initial) === false,
            shouldReduceMotion,
        });
    }
    const visualElement = visualElementRef.current;
    useIsomorphicLayoutEffect(() => {
        visualElement === null || visualElement === void 0 ? void 0 : visualElement.syncRender();
    });
    React.useEffect(() => {
        var _a;
        (_a = visualElement === null || visualElement === void 0 ? void 0 : visualElement.animationState) === null || _a === void 0 ? void 0 : _a.animateChanges();
    });
    useIsomorphicLayoutEffect(() => () => visualElement === null || visualElement === void 0 ? void 0 : visualElement.notifyUnmount(), []);
    return visualElement;
}

function isRefObject(ref) {
    return (typeof ref === "object" &&
        Object.prototype.hasOwnProperty.call(ref, "current"));
}

/**
 * Creates a ref function that, when called, hydrates the provided
 * external ref and VisualElement.
 */
function useMotionRef(visualState, visualElement, externalRef) {
    return React.useCallback((instance) => {
        var _a;
        instance && ((_a = visualState.mount) === null || _a === void 0 ? void 0 : _a.call(visualState, instance));
        if (visualElement) {
            instance
                ? visualElement.mount(instance)
                : visualElement.unmount();
        }
        if (externalRef) {
            if (typeof externalRef === "function") {
                externalRef(instance);
            }
            else if (isRefObject(externalRef)) {
                externalRef.current = instance;
            }
        }
    }, 
    /**
     * Only pass a new ref callback to React if we've received a visual element
     * factory. Otherwise we'll be mounting/remounting every time externalRef
     * or other dependencies change.
     */
    [visualElement]);
}

/**
 * Decides if the supplied variable is an array of variant labels
 */
function isVariantLabels(v) {
    return Array.isArray(v);
}
/**
 * Decides if the supplied variable is variant label
 */
function isVariantLabel(v) {
    return typeof v === "string" || isVariantLabels(v);
}
/**
 * Creates an object containing the latest state of every MotionValue on a VisualElement
 */
function getCurrent(visualElement) {
    const current = {};
    visualElement.forEachValue((value, key) => (current[key] = value.get()));
    return current;
}
/**
 * Creates an object containing the latest velocity of every MotionValue on a VisualElement
 */
function getVelocity$1(visualElement) {
    const velocity = {};
    visualElement.forEachValue((value, key) => (velocity[key] = value.getVelocity()));
    return velocity;
}
function resolveVariantFromProps(props, definition, custom, currentValues = {}, currentVelocity = {}) {
    var _a;
    /**
     * If the variant definition is a function, resolve.
     */
    if (typeof definition === "function") {
        definition = definition(custom !== null && custom !== void 0 ? custom : props.custom, currentValues, currentVelocity);
    }
    /**
     * If the variant definition is a variant label, or
     * the function returned a variant label, resolve.
     */
    if (typeof definition === "string") {
        definition = (_a = props.variants) === null || _a === void 0 ? void 0 : _a[definition];
    }
    /**
     * At this point we've resolved both functions and variant labels,
     * but the resolved variant label might itself have been a function.
     * If so, resolve. This can only have returned a valid target object.
     */
    if (typeof definition === "function") {
        definition = definition(custom !== null && custom !== void 0 ? custom : props.custom, currentValues, currentVelocity);
    }
    return definition;
}
function resolveVariant(visualElement, definition, custom) {
    const props = visualElement.getProps();
    return resolveVariantFromProps(props, definition, custom !== null && custom !== void 0 ? custom : props.custom, getCurrent(visualElement), getVelocity$1(visualElement));
}
function checkIfControllingVariants(props) {
    var _a;
    return (typeof ((_a = props.animate) === null || _a === void 0 ? void 0 : _a.start) === "function" ||
        isVariantLabel(props.initial) ||
        isVariantLabel(props.animate) ||
        isVariantLabel(props.whileHover) ||
        isVariantLabel(props.whileDrag) ||
        isVariantLabel(props.whileTap) ||
        isVariantLabel(props.whileFocus) ||
        isVariantLabel(props.exit));
}
function checkIfVariantNode(props) {
    return Boolean(checkIfControllingVariants(props) || props.variants);
}

function getCurrentTreeVariants(props, context) {
    if (checkIfControllingVariants(props)) {
        const { initial, animate } = props;
        return {
            initial: initial === false || isVariantLabel(initial)
                ? initial
                : undefined,
            animate: isVariantLabel(animate) ? animate : undefined,
        };
    }
    return props.inherit !== false ? context : {};
}

function useCreateMotionContext(props) {
    const { initial, animate } = getCurrentTreeVariants(props, React.useContext(MotionContext));
    return React.useMemo(() => ({ initial, animate }), [variantLabelsAsDependency(initial), variantLabelsAsDependency(animate)]);
}
function variantLabelsAsDependency(prop) {
    return Array.isArray(prop) ? prop.join(" ") : prop;
}

/**
 * Creates a constant value over the lifecycle of a component.
 *
 * Even if `useMemo` is provided an empty array as its final argument, it doesn't offer
 * a guarantee that it won't re-run for performance reasons later on. By using `useConstant`
 * you can ensure that initialisers don't execute twice or more.
 */
function useConstant(init) {
    const ref = React.useRef(null);
    if (ref.current === null) {
        ref.current = init();
    }
    return ref.current;
}

/**
 * This should only ever be modified on the client otherwise it'll
 * persist through server requests. If we need instanced states we
 * could lazy-init via root.
 */
const globalProjectionState = {
    /**
     * Global flag as to whether the tree has animated since the last time
     * we resized the window
     */
    hasAnimatedSinceResize: true,
    /**
     * We set this to true once, on the first update. Any nodes added to the tree beyond that
     * update will be given a `data-projection-id` attribute.
     */
    hasEverUpdated: false,
};

let id$1 = 1;
function useProjectionId() {
    return useConstant(() => {
        if (globalProjectionState.hasEverUpdated) {
            return id$1++;
        }
    });
}

const LayoutGroupContext = React.createContext({});

/**
 * Internal, exported only for usage in Framer
 */
const SwitchLayoutGroupContext = React.createContext({});

function useProjection(projectionId, { layoutId, layout, drag, dragConstraints, layoutScroll }, visualElement, ProjectionNodeConstructor) {
    var _a;
    const initialPromotionConfig = React.useContext(SwitchLayoutGroupContext);
    if (!ProjectionNodeConstructor ||
        !visualElement ||
        (visualElement === null || visualElement === void 0 ? void 0 : visualElement.projection)) {
        return;
    }
    visualElement.projection = new ProjectionNodeConstructor(projectionId, visualElement.getLatestValues(), (_a = visualElement.parent) === null || _a === void 0 ? void 0 : _a.projection);
    visualElement.projection.setOptions({
        layoutId,
        layout,
        alwaysMeasureLayout: Boolean(drag) || (dragConstraints && isRefObject(dragConstraints)),
        visualElement,
        scheduleRender: () => visualElement.scheduleRender(),
        /**
         * TODO: Update options in an effect. This could be tricky as it'll be too late
         * to update by the time layout animations run.
         * We also need to fix this safeToRemove by linking it up to the one returned by usePresence,
         * ensuring it gets called if there's no potential layout animations.
         *
         */
        animationType: typeof layout === "string" ? layout : "both",
        initialPromotionConfig,
        layoutScroll,
    });
}

class VisualElementHandler extends React__default["default"].Component {
    /**
     * Update visual element props as soon as we know this update is going to be commited.
     */
    getSnapshotBeforeUpdate() {
        this.updateProps();
        return null;
    }
    componentDidUpdate() { }
    updateProps() {
        const { visualElement, props } = this.props;
        if (visualElement)
            visualElement.setProps(props);
    }
    render() {
        return this.props.children;
    }
}

/**
 * Create a `motion` component.
 *
 * This function accepts a Component argument, which can be either a string (ie "div"
 * for `motion.div`), or an actual React component.
 *
 * Alongside this is a config option which provides a way of rendering the provided
 * component "offline", or outside the React render cycle.
 */
function createMotionComponent({ preloadedFeatures, createVisualElement, projectionNodeConstructor, useRender, useVisualState, Component, }) {
    preloadedFeatures && loadFeatures(preloadedFeatures);
    function MotionComponent(props, externalRef) {
        const layoutId = useLayoutId(props);
        props = Object.assign(Object.assign({}, props), { layoutId });
        /**
         * If we're rendering in a static environment, we only visually update the component
         * as a result of a React-rerender rather than interactions or animations. This
         * means we don't need to load additional memory structures like VisualElement,
         * or any gesture/animation features.
         */
        const config = React.useContext(MotionConfigContext);
        let features = null;
        const context = useCreateMotionContext(props);
        /**
         * Create a unique projection ID for this component. If a new component is added
         * during a layout animation we'll use this to query the DOM and hydrate its ref early, allowing
         * us to measure it as soon as any layout effect flushes pending layout animations.
         *
         * Performance note: It'd be better not to have to search the DOM for these elements.
         * For newly-entering components it could be enough to only correct treeScale, in which
         * case we could mount in a scale-correction mode. This wouldn't be enough for
         * shared element transitions however. Perhaps for those we could revert to a root node
         * that gets forceRendered and layout animations are triggered on its layout effect.
         */
        const projectionId = config.isStatic ? undefined : useProjectionId();
        /**
         *
         */
        const visualState = useVisualState(props, config.isStatic);
        if (!config.isStatic && isBrowser) {
            /**
             * Create a VisualElement for this component. A VisualElement provides a common
             * interface to renderer-specific APIs (ie DOM/Three.js etc) as well as
             * providing a way of rendering to these APIs outside of the React render loop
             * for more performant animations and interactions
             */
            context.visualElement = useVisualElement(Component, visualState, Object.assign(Object.assign({}, config), props), createVisualElement);
            useProjection(projectionId, props, context.visualElement, projectionNodeConstructor ||
                featureDefinitions.projectionNodeConstructor);
            /**
             * Load Motion gesture and animation features. These are rendered as renderless
             * components so each feature can optionally make use of React lifecycle methods.
             */
            features = useFeatures(props, context.visualElement, preloadedFeatures);
        }
        /**
         * The mount order and hierarchy is specific to ensure our element ref
         * is hydrated by the time features fire their effects.
         */
        return (React__namespace.createElement(VisualElementHandler, { visualElement: context.visualElement, props: Object.assign(Object.assign({}, config), props) },
            features,
            React__namespace.createElement(MotionContext.Provider, { value: context }, useRender(Component, props, projectionId, useMotionRef(visualState, context.visualElement, externalRef), visualState, config.isStatic, context.visualElement))));
    }
    return React.forwardRef(MotionComponent);
}
function useLayoutId({ layoutId }) {
    var _a;
    const layoutGroupId = (_a = React.useContext(LayoutGroupContext)) === null || _a === void 0 ? void 0 : _a.id;
    return layoutGroupId && layoutId !== undefined
        ? layoutGroupId + "-" + layoutId
        : layoutId;
}

/**
 * Convert any React component into a `motion` component. The provided component
 * **must** use `React.forwardRef` to the underlying DOM component you want to animate.
 *
 * ```jsx
 * const Component = React.forwardRef((props, ref) => {
 *   return <div ref={ref} />
 * })
 *
 * const MotionComponent = motion(Component)
 * ```
 *
 * @public
 */
function createMotionProxy(createConfig) {
    function custom(Component, customMotionComponentConfig = {}) {
        return createMotionComponent(createConfig(Component, customMotionComponentConfig));
    }
    if (typeof Proxy === "undefined") {
        return custom;
    }
    /**
     * A cache of generated `motion` components, e.g `motion.div`, `motion.input` etc.
     * Rather than generating them anew every render.
     */
    const componentCache = new Map();
    return new Proxy(custom, {
        /**
         * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
         * The prop name is passed through as `key` and we can use that to generate a `motion`
         * DOM component with that name.
         */
        get: (_target, key) => {
            /**
             * If this element doesn't exist in the component cache, create it and cache.
             */
            if (!componentCache.has(key)) {
                componentCache.set(key, custom(key));
            }
            return componentCache.get(key);
        },
    });
}

/**
 * We keep these listed seperately as we use the lowercase tag names as part
 * of the runtime bundle to detect SVG components
 */
const lowercaseSVGElements = [
    "animate",
    "circle",
    "defs",
    "desc",
    "ellipse",
    "g",
    "image",
    "line",
    "filter",
    "marker",
    "mask",
    "metadata",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "rect",
    "stop",
    "svg",
    "switch",
    "symbol",
    "text",
    "tspan",
    "use",
    "view",
];

function isSVGComponent(Component) {
    if (
    /**
     * If it's not a string, it's a custom React component. Currently we only support
     * HTML custom React components.
     */
    typeof Component !== "string" ||
        /**
         * If it contains a dash, the element is a custom HTML webcomponent.
         */
        Component.includes("-")) {
        return false;
    }
    else if (
    /**
     * If it's in our list of lowercase SVG tags, it's an SVG component
     */
    lowercaseSVGElements.indexOf(Component) > -1 ||
        /**
         * If it contains a capital letter, it's an SVG component
         */
        /[A-Z]/.test(Component)) {
        return true;
    }
    return false;
}

const scaleCorrectors = {};
function addScaleCorrector(correctors) {
    Object.assign(scaleCorrectors, correctors);
}

/**
 * A list of all transformable axes. We'll use this list to generated a version
 * of each axes for each transform.
 */
const transformAxes = ["", "X", "Y", "Z"];
/**
 * An ordered array of each transformable value. By default, transform values
 * will be sorted to this order.
 */
const order = ["translate", "scale", "rotate", "skew"];
/**
 * Generate a list of every possible transform key.
 */
const transformProps = ["transformPerspective", "x", "y", "z"];
order.forEach((operationKey) => transformAxes.forEach((axesKey) => transformProps.push(operationKey + axesKey)));
/**
 * A function to use with Array.sort to sort transform keys by their default order.
 */
function sortTransformProps(a, b) {
    return transformProps.indexOf(a) - transformProps.indexOf(b);
}
/**
 * A quick lookup for transform props.
 */
const transformPropSet = new Set(transformProps);
function isTransformProp(key) {
    return transformPropSet.has(key);
}
/**
 * A quick lookup for transform origin props
 */
const transformOriginProps = new Set(["originX", "originY", "originZ"]);
function isTransformOriginProp(key) {
    return transformOriginProps.has(key);
}

function isForcedMotionValue(key, { layout, layoutId }) {
    return (isTransformProp(key) ||
        isTransformOriginProp(key) ||
        ((layout || layoutId !== undefined) &&
            (!!scaleCorrectors[key] || key === "opacity")));
}

const isMotionValue = (value) => {
    return Boolean(value !== null && typeof value === "object" && value.getVelocity);
};

const translateAlias = {
    x: "translateX",
    y: "translateY",
    z: "translateZ",
    transformPerspective: "perspective",
};
/**
 * Build a CSS transform style from individual x/y/scale etc properties.
 *
 * This outputs with a default order of transforms/scales/rotations, this can be customised by
 * providing a transformTemplate function.
 */
function buildTransform({ transform, transformKeys }, { enableHardwareAcceleration = true, allowTransformNone = true, }, transformIsDefault, transformTemplate) {
    // The transform string we're going to build into.
    let transformString = "";
    // Transform keys into their default order - this will determine the output order.
    transformKeys.sort(sortTransformProps);
    // Track whether the defined transform has a defined z so we don't add a
    // second to enable hardware acceleration
    let transformHasZ = false;
    // Loop over each transform and build them into transformString
    const numTransformKeys = transformKeys.length;
    for (let i = 0; i < numTransformKeys; i++) {
        const key = transformKeys[i];
        transformString += `${translateAlias[key] || key}(${transform[key]}) `;
        if (key === "z")
            transformHasZ = true;
    }
    if (!transformHasZ && enableHardwareAcceleration) {
        transformString += "translateZ(0)";
    }
    transformString = transformString.trim();
    // If we have a custom `transform` template, pass our transform values and
    // generated transformString to that before returning
    if (transformTemplate) {
        transformString = transformTemplate(transform, transformIsDefault ? "" : transformString);
    }
    else if (allowTransformNone && transformIsDefault) {
        transformString = "none";
    }
    return transformString;
}
/**
 * Build a transformOrigin style. Uses the same defaults as the browser for
 * undefined origins.
 */
function buildTransformOrigin({ originX = "50%", originY = "50%", originZ = 0, }) {
    return `${originX} ${originY} ${originZ}`;
}

/**
 * Returns true if the provided key is a CSS variable
 */
function isCSSVariable$1(key) {
    return key.startsWith("--");
}

/**
 * Provided a value and a ValueType, returns the value as that value type.
 */
const getValueAsType = (value, type) => {
    return type && typeof value === "number"
        ? type.transform(value)
        : value;
};

const int = Object.assign(Object.assign({}, styleValueTypes.number), { transform: Math.round });

const numberValueTypes = {
    // Border props
    borderWidth: styleValueTypes.px,
    borderTopWidth: styleValueTypes.px,
    borderRightWidth: styleValueTypes.px,
    borderBottomWidth: styleValueTypes.px,
    borderLeftWidth: styleValueTypes.px,
    borderRadius: styleValueTypes.px,
    radius: styleValueTypes.px,
    borderTopLeftRadius: styleValueTypes.px,
    borderTopRightRadius: styleValueTypes.px,
    borderBottomRightRadius: styleValueTypes.px,
    borderBottomLeftRadius: styleValueTypes.px,
    // Positioning props
    width: styleValueTypes.px,
    maxWidth: styleValueTypes.px,
    height: styleValueTypes.px,
    maxHeight: styleValueTypes.px,
    size: styleValueTypes.px,
    top: styleValueTypes.px,
    right: styleValueTypes.px,
    bottom: styleValueTypes.px,
    left: styleValueTypes.px,
    // Spacing props
    padding: styleValueTypes.px,
    paddingTop: styleValueTypes.px,
    paddingRight: styleValueTypes.px,
    paddingBottom: styleValueTypes.px,
    paddingLeft: styleValueTypes.px,
    margin: styleValueTypes.px,
    marginTop: styleValueTypes.px,
    marginRight: styleValueTypes.px,
    marginBottom: styleValueTypes.px,
    marginLeft: styleValueTypes.px,
    // Transform props
    rotate: styleValueTypes.degrees,
    rotateX: styleValueTypes.degrees,
    rotateY: styleValueTypes.degrees,
    rotateZ: styleValueTypes.degrees,
    scale: styleValueTypes.scale,
    scaleX: styleValueTypes.scale,
    scaleY: styleValueTypes.scale,
    scaleZ: styleValueTypes.scale,
    skew: styleValueTypes.degrees,
    skewX: styleValueTypes.degrees,
    skewY: styleValueTypes.degrees,
    distance: styleValueTypes.px,
    translateX: styleValueTypes.px,
    translateY: styleValueTypes.px,
    translateZ: styleValueTypes.px,
    x: styleValueTypes.px,
    y: styleValueTypes.px,
    z: styleValueTypes.px,
    perspective: styleValueTypes.px,
    transformPerspective: styleValueTypes.px,
    opacity: styleValueTypes.alpha,
    originX: styleValueTypes.progressPercentage,
    originY: styleValueTypes.progressPercentage,
    originZ: styleValueTypes.px,
    // Misc
    zIndex: int,
    // SVG
    fillOpacity: styleValueTypes.alpha,
    strokeOpacity: styleValueTypes.alpha,
    numOctaves: int,
};

function buildHTMLStyles(state, latestValues, options, transformTemplate) {
    var _a;
    const { style, vars, transform, transformKeys, transformOrigin } = state;
    // Empty the transformKeys array. As we're throwing out refs to its items
    // this might not be as cheap as suspected. Maybe using the array as a buffer
    // with a manual incrementation would be better.
    transformKeys.length = 0;
    // Track whether we encounter any transform or transformOrigin values.
    let hasTransform = false;
    let hasTransformOrigin = false;
    // Does the calculated transform essentially equal "none"?
    let transformIsNone = true;
    /**
     * Loop over all our latest animated values and decide whether to handle them
     * as a style or CSS variable.
     *
     * Transforms and transform origins are kept seperately for further processing.
     */
    for (const key in latestValues) {
        const value = latestValues[key];
        /**
         * If this is a CSS variable we don't do any further processing.
         */
        if (isCSSVariable$1(key)) {
            vars[key] = value;
            continue;
        }
        // Convert the value to its default value type, ie 0 -> "0px"
        const valueType = numberValueTypes[key];
        const valueAsType = getValueAsType(value, valueType);
        if (isTransformProp(key)) {
            // If this is a transform, flag to enable further transform processing
            hasTransform = true;
            transform[key] = valueAsType;
            transformKeys.push(key);
            // If we already know we have a non-default transform, early return
            if (!transformIsNone)
                continue;
            // Otherwise check to see if this is a default transform
            if (value !== ((_a = valueType.default) !== null && _a !== void 0 ? _a : 0))
                transformIsNone = false;
        }
        else if (isTransformOriginProp(key)) {
            transformOrigin[key] = valueAsType;
            // If this is a transform origin, flag and enable further transform-origin processing
            hasTransformOrigin = true;
        }
        else {
            style[key] = valueAsType;
        }
    }
    if (hasTransform) {
        style.transform = buildTransform(state, options, transformIsNone, transformTemplate);
    }
    else if (transformTemplate) {
        style.transform = transformTemplate({}, "");
    }
    else if (!latestValues.transform && style.transform) {
        style.transform = "none";
    }
    if (hasTransformOrigin) {
        style.transformOrigin = buildTransformOrigin(transformOrigin);
    }
}

const createHtmlRenderState = () => ({
    style: {},
    transform: {},
    transformKeys: [],
    transformOrigin: {},
    vars: {},
});

function copyRawValuesOnly(target, source, props) {
    for (const key in source) {
        if (!isMotionValue(source[key]) && !isForcedMotionValue(key, props)) {
            target[key] = source[key];
        }
    }
}
function useInitialMotionValues({ transformTemplate }, visualState, isStatic) {
    return React.useMemo(() => {
        const state = createHtmlRenderState();
        buildHTMLStyles(state, visualState, { enableHardwareAcceleration: !isStatic }, transformTemplate);
        const { vars, style } = state;
        return Object.assign(Object.assign({}, vars), style);
    }, [visualState]);
}
function useStyle(props, visualState, isStatic) {
    const styleProp = props.style || {};
    let style = {};
    /**
     * Copy non-Motion Values straight into style
     */
    copyRawValuesOnly(style, styleProp, props);
    Object.assign(style, useInitialMotionValues(props, visualState, isStatic));
    if (props.transformValues) {
        style = props.transformValues(style);
    }
    return style;
}
function useHTMLProps(props, visualState, isStatic) {
    // The `any` isn't ideal but it is the type of createElement props argument
    const htmlProps = {};
    const style = useStyle(props, visualState, isStatic);
    if (Boolean(props.drag) && props.dragListener !== false) {
        // Disable the ghost element when a user drags
        htmlProps.draggable = false;
        // Disable text selection
        style.userSelect =
            style.WebkitUserSelect =
                style.WebkitTouchCallout =
                    "none";
        // Disable scrolling on the draggable direction
        style.touchAction =
            props.drag === true
                ? "none"
                : `pan-${props.drag === "x" ? "y" : "x"}`;
    }
    htmlProps.style = style;
    return htmlProps;
}

/**
 * A list of all valid MotionProps.
 *
 * @privateRemarks
 * This doesn't throw if a `MotionProp` name is missing - it should.
 */
const validMotionProps = new Set([
    "initial",
    "animate",
    "exit",
    "style",
    "variants",
    "transition",
    "transformTemplate",
    "transformValues",
    "custom",
    "inherit",
    "layout",
    "layoutId",
    "layoutDependency",
    "onLayoutAnimationStart",
    "onLayoutAnimationComplete",
    "onLayoutMeasure",
    "onBeforeLayoutMeasure",
    "onAnimationStart",
    "onAnimationComplete",
    "onUpdate",
    "onDragStart",
    "onDrag",
    "onDragEnd",
    "onMeasureDragConstraints",
    "onDirectionLock",
    "onDragTransitionEnd",
    "drag",
    "dragControls",
    "dragListener",
    "dragConstraints",
    "dragDirectionLock",
    "dragSnapToOrigin",
    "_dragX",
    "_dragY",
    "dragElastic",
    "dragMomentum",
    "dragPropagation",
    "dragTransition",
    "whileDrag",
    "onPan",
    "onPanStart",
    "onPanEnd",
    "onPanSessionStart",
    "onTap",
    "onTapStart",
    "onTapCancel",
    "onHoverStart",
    "onHoverEnd",
    "whileFocus",
    "whileTap",
    "whileHover",
    "whileInView",
    "onViewportEnter",
    "onViewportLeave",
    "viewport",
    "layoutScroll",
]);
/**
 * Check whether a prop name is a valid `MotionProp` key.
 *
 * @param key - Name of the property to check
 * @returns `true` is key is a valid `MotionProp`.
 *
 * @public
 */
function isValidMotionProp(key) {
    return validMotionProps.has(key);
}

let shouldForward = (key) => !isValidMotionProp(key);
function loadExternalIsValidProp(isValidProp) {
    if (!isValidProp)
        return;
    // Explicitly filter our events
    shouldForward = (key) => key.startsWith("on") ? !isValidMotionProp(key) : isValidProp(key);
}
/**
 * Emotion and Styled Components both allow users to pass through arbitrary props to their components
 * to dynamically generate CSS. They both use the `@emotion/is-prop-valid` package to determine which
 * of these should be passed to the underlying DOM node.
 *
 * However, when styling a Motion component `styled(motion.div)`, both packages pass through *all* props
 * as it's seen as an arbitrary component rather than a DOM node. Motion only allows arbitrary props
 * passed through the `custom` prop so it doesn't *need* the payload or computational overhead of
 * `@emotion/is-prop-valid`, however to fix this problem we need to use it.
 *
 * By making it an optionalDependency we can offer this functionality only in the situations where it's
 * actually required.
 */
try {
    /**
     * We attempt to import this package but require won't be defined in esm environments, in that case
     * isPropValid will have to be provided via `MotionContext`. In a 6.0.0 this should probably be removed
     * in favour of explicit injection.
     */
    loadExternalIsValidProp(require("@emotion/is-prop-valid").default);
}
catch (_a) {
    // We don't need to actually do anything here - the fallback is the existing `isPropValid`.
}
function filterProps(props, isDom, forwardMotionProps) {
    const filteredProps = {};
    for (const key in props) {
        if (shouldForward(key) ||
            (forwardMotionProps === true && isValidMotionProp(key)) ||
            (!isDom && !isValidMotionProp(key)) ||
            // If trying to use native HTML drag events, forward drag listeners
            (props["draggable"] && key.startsWith("onDrag"))) {
            filteredProps[key] = props[key];
        }
    }
    return filteredProps;
}

function calcOrigin$1(origin, offset, size) {
    return typeof origin === "string"
        ? origin
        : styleValueTypes.px.transform(offset + size * origin);
}
/**
 * The SVG transform origin defaults are different to CSS and is less intuitive,
 * so we use the measured dimensions of the SVG to reconcile these.
 */
function calcSVGTransformOrigin(dimensions, originX, originY) {
    const pxOriginX = calcOrigin$1(originX, dimensions.x, dimensions.width);
    const pxOriginY = calcOrigin$1(originY, dimensions.y, dimensions.height);
    return `${pxOriginX} ${pxOriginY}`;
}

const dashKeys = {
    offset: "stroke-dashoffset",
    array: "stroke-dasharray",
};
const camelKeys = {
    offset: "strokeDashoffset",
    array: "strokeDasharray",
};
/**
 * Build SVG path properties. Uses the path's measured length to convert
 * our custom pathLength, pathSpacing and pathOffset into stroke-dashoffset
 * and stroke-dasharray attributes.
 *
 * This function is mutative to reduce per-frame GC.
 */
function buildSVGPath(attrs, length, spacing = 1, offset = 0, useDashCase = true) {
    // Normalise path length by setting SVG attribute pathLength to 1
    attrs.pathLength = 1;
    // We use dash case when setting attributes directly to the DOM node and camel case
    // when defining props on a React component.
    const keys = useDashCase ? dashKeys : camelKeys;
    // Build the dash offset
    attrs[keys.offset] = styleValueTypes.px.transform(-offset);
    // Build the dash array
    const pathLength = styleValueTypes.px.transform(length);
    const pathSpacing = styleValueTypes.px.transform(spacing);
    attrs[keys.array] = `${pathLength} ${pathSpacing}`;
}

/**
 * Build SVG visual attrbutes, like cx and style.transform
 */
function buildSVGAttrs(state, _a, options, transformTemplate) {
    var { attrX, attrY, originX, originY, pathLength, pathSpacing = 1, pathOffset = 0 } = _a, 
    // This is object creation, which we try to avoid per-frame.
    latest = tslib.__rest(_a, ["attrX", "attrY", "originX", "originY", "pathLength", "pathSpacing", "pathOffset"]);
    buildHTMLStyles(state, latest, options, transformTemplate);
    state.attrs = state.style;
    state.style = {};
    const { attrs, style, dimensions } = state;
    /**
     * However, we apply transforms as CSS transforms. So if we detect a transform we take it from attrs
     * and copy it into style.
     */
    if (attrs.transform) {
        if (dimensions)
            style.transform = attrs.transform;
        delete attrs.transform;
    }
    // Parse transformOrigin
    if (dimensions &&
        (originX !== undefined || originY !== undefined || style.transform)) {
        style.transformOrigin = calcSVGTransformOrigin(dimensions, originX !== undefined ? originX : 0.5, originY !== undefined ? originY : 0.5);
    }
    // Treat x/y not as shortcuts but as actual attributes
    if (attrX !== undefined)
        attrs.x = attrX;
    if (attrY !== undefined)
        attrs.y = attrY;
    // Build SVG path if one has been defined
    if (pathLength !== undefined) {
        buildSVGPath(attrs, pathLength, pathSpacing, pathOffset, false);
    }
}

const createSvgRenderState = () => (Object.assign(Object.assign({}, createHtmlRenderState()), { attrs: {} }));

function useSVGProps(props, visualState) {
    const visualProps = React.useMemo(() => {
        const state = createSvgRenderState();
        buildSVGAttrs(state, visualState, { enableHardwareAcceleration: false }, props.transformTemplate);
        return Object.assign(Object.assign({}, state.attrs), { style: Object.assign({}, state.style) });
    }, [visualState]);
    if (props.style) {
        const rawStyles = {};
        copyRawValuesOnly(rawStyles, props.style, props);
        visualProps.style = Object.assign(Object.assign({}, rawStyles), visualProps.style);
    }
    return visualProps;
}

function createUseRender(forwardMotionProps = false) {
    const useRender = (Component, props, projectionId, ref, { latestValues }, isStatic) => {
        const useVisualProps = isSVGComponent(Component)
            ? useSVGProps
            : useHTMLProps;
        const visualProps = useVisualProps(props, latestValues, isStatic);
        const filteredProps = filterProps(props, typeof Component === "string", forwardMotionProps);
        const elementProps = Object.assign(Object.assign(Object.assign({}, filteredProps), visualProps), { ref });
        if (projectionId) {
            elementProps["data-projection-id"] = projectionId;
        }
        return React.createElement(Component, elementProps);
    };
    return useRender;
}

const CAMEL_CASE_PATTERN = /([a-z])([A-Z])/g;
const REPLACE_TEMPLATE = "$1-$2";
/**
 * Convert camelCase to dash-case properties.
 */
const camelToDash = (str) => str.replace(CAMEL_CASE_PATTERN, REPLACE_TEMPLATE).toLowerCase();

function renderHTML(element, { style, vars }, styleProp, projection) {
    Object.assign(element.style, style, projection && projection.getProjectionStyles(styleProp));
    // Loop over any CSS variables and assign those.
    for (const key in vars) {
        element.style.setProperty(key, vars[key]);
    }
}

/**
 * A set of attribute names that are always read/written as camel case.
 */
const camelCaseAttributes = new Set([
    "baseFrequency",
    "diffuseConstant",
    "kernelMatrix",
    "kernelUnitLength",
    "keySplines",
    "keyTimes",
    "limitingConeAngle",
    "markerHeight",
    "markerWidth",
    "numOctaves",
    "targetX",
    "targetY",
    "surfaceScale",
    "specularConstant",
    "specularExponent",
    "stdDeviation",
    "tableValues",
    "viewBox",
    "gradientTransform",
    "pathLength",
]);

function renderSVG(element, renderState, _styleProp, projection) {
    renderHTML(element, renderState, undefined, projection);
    for (const key in renderState.attrs) {
        element.setAttribute(!camelCaseAttributes.has(key) ? camelToDash(key) : key, renderState.attrs[key]);
    }
}

function scrapeMotionValuesFromProps$1(props) {
    const { style } = props;
    const newValues = {};
    for (const key in style) {
        if (isMotionValue(style[key]) || isForcedMotionValue(key, props)) {
            newValues[key] = style[key];
        }
    }
    return newValues;
}

function scrapeMotionValuesFromProps(props) {
    const newValues = scrapeMotionValuesFromProps$1(props);
    for (const key in props) {
        if (isMotionValue(props[key])) {
            const targetKey = key === "x" || key === "y" ? "attr" + key.toUpperCase() : key;
            newValues[targetKey] = props[key];
        }
    }
    return newValues;
}

function isAnimationControls(v) {
    return typeof v === "object" && typeof v.start === "function";
}

const isKeyframesTarget = (v) => {
    return Array.isArray(v);
};

const isCustomValue = (v) => {
    return Boolean(v && typeof v === "object" && v.mix && v.toValue);
};
const resolveFinalValueInKeyframes = (v) => {
    // TODO maybe throw if v.length - 1 is placeholder token?
    return isKeyframesTarget(v) ? v[v.length - 1] || 0 : v;
};

/**
 * If the provided value is a MotionValue, this returns the actual value, otherwise just the value itself
 *
 * TODO: Remove and move to library
 */
function resolveMotionValue(value) {
    const unwrappedValue = isMotionValue(value) ? value.get() : value;
    return isCustomValue(unwrappedValue)
        ? unwrappedValue.toValue()
        : unwrappedValue;
}

function makeState({ scrapeMotionValuesFromProps, createRenderState, onMount, }, props, context, presenceContext) {
    const state = {
        latestValues: makeLatestValues(props, context, presenceContext, scrapeMotionValuesFromProps),
        renderState: createRenderState(),
    };
    if (onMount) {
        state.mount = (instance) => onMount(props, instance, state);
    }
    return state;
}
const makeUseVisualState = (config) => (props, isStatic) => {
    const context = React.useContext(MotionContext);
    const presenceContext = React.useContext(PresenceContext);
    return isStatic
        ? makeState(config, props, context, presenceContext)
        : useConstant(() => makeState(config, props, context, presenceContext));
};
function makeLatestValues(props, context, presenceContext, scrapeMotionValues) {
    const values = {};
    const blockInitialAnimation = (presenceContext === null || presenceContext === void 0 ? void 0 : presenceContext.initial) === false;
    const motionValues = scrapeMotionValues(props);
    for (const key in motionValues) {
        values[key] = resolveMotionValue(motionValues[key]);
    }
    let { initial, animate } = props;
    const isControllingVariants = checkIfControllingVariants(props);
    const isVariantNode = checkIfVariantNode(props);
    if (context &&
        isVariantNode &&
        !isControllingVariants &&
        props.inherit !== false) {
        initial !== null && initial !== void 0 ? initial : (initial = context.initial);
        animate !== null && animate !== void 0 ? animate : (animate = context.animate);
    }
    const initialAnimationIsBlocked = blockInitialAnimation || initial === false;
    const variantToSet = initialAnimationIsBlocked ? animate : initial;
    if (variantToSet &&
        typeof variantToSet !== "boolean" &&
        !isAnimationControls(variantToSet)) {
        const list = Array.isArray(variantToSet) ? variantToSet : [variantToSet];
        list.forEach((definition) => {
            const resolved = resolveVariantFromProps(props, definition);
            if (!resolved)
                return;
            const { transitionEnd, transition } = resolved, target = tslib.__rest(resolved, ["transitionEnd", "transition"]);
            for (const key in target) {
                let valueTarget = target[key];
                if (Array.isArray(valueTarget)) {
                    /**
                     * Take final keyframe if the initial animation is blocked because
                     * we want to initialise at the end of that blocked animation.
                     */
                    const index = initialAnimationIsBlocked
                        ? valueTarget.length - 1
                        : 0;
                    valueTarget = valueTarget[index];
                }
                if (valueTarget !== null) {
                    values[key] = valueTarget;
                }
            }
            for (const key in transitionEnd)
                values[key] = transitionEnd[key];
        });
    }
    return values;
}

const svgMotionConfig = {
    useVisualState: makeUseVisualState({
        scrapeMotionValuesFromProps: scrapeMotionValuesFromProps,
        createRenderState: createSvgRenderState,
        onMount: (props, instance, { renderState, latestValues }) => {
            try {
                renderState.dimensions =
                    typeof instance.getBBox ===
                        "function"
                        ? instance.getBBox()
                        : instance.getBoundingClientRect();
            }
            catch (e) {
                // Most likely trying to measure an unrendered element under Firefox
                renderState.dimensions = {
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                };
            }
            buildSVGAttrs(renderState, latestValues, { enableHardwareAcceleration: false }, props.transformTemplate);
            renderSVG(instance, renderState);
        },
    }),
};

const htmlMotionConfig = {
    useVisualState: makeUseVisualState({
        scrapeMotionValuesFromProps: scrapeMotionValuesFromProps$1,
        createRenderState: createHtmlRenderState,
    }),
};

function createDomMotionConfig(Component, { forwardMotionProps = false }, preloadedFeatures, createVisualElement, projectionNodeConstructor) {
    const baseConfig = isSVGComponent(Component)
        ? svgMotionConfig
        : htmlMotionConfig;
    return Object.assign(Object.assign({}, baseConfig), { preloadedFeatures, useRender: createUseRender(forwardMotionProps), createVisualElement,
        projectionNodeConstructor,
        Component });
}

exports.AnimationType = void 0;
(function (AnimationType) {
    AnimationType["Animate"] = "animate";
    AnimationType["Hover"] = "whileHover";
    AnimationType["Tap"] = "whileTap";
    AnimationType["Drag"] = "whileDrag";
    AnimationType["Focus"] = "whileFocus";
    AnimationType["InView"] = "whileInView";
    AnimationType["Exit"] = "exit";
})(exports.AnimationType || (exports.AnimationType = {}));

function addDomEvent(target, eventName, handler, options = { passive: true }) {
    target.addEventListener(eventName, handler, options);
    return () => target.removeEventListener(eventName, handler);
}
/**
 * Attaches an event listener directly to the provided DOM element.
 *
 * Bypassing React's event system can be desirable, for instance when attaching non-passive
 * event handlers.
 *
 * ```jsx
 * const ref = useRef(null)
 *
 * useDomEvent(ref, 'wheel', onWheel, { passive: false })
 *
 * return <div ref={ref} />
 * ```
 *
 * @param ref - React.RefObject that's been provided to the element you want to bind the listener to.
 * @param eventName - Name of the event you want listen for.
 * @param handler - Function to fire when receiving the event.
 * @param options - Options to pass to `Event.addEventListener`.
 *
 * @public
 */
function useDomEvent(ref, eventName, handler, options) {
    React.useEffect(() => {
        const element = ref.current;
        if (handler && element) {
            return addDomEvent(element, eventName, handler, options);
        }
    }, [ref, eventName, handler, options]);
}

/**
 *
 * @param props
 * @param ref
 * @internal
 */
function useFocusGesture({ whileFocus, visualElement }) {
    const onFocus = () => {
        var _a;
        (_a = visualElement.animationState) === null || _a === void 0 ? void 0 : _a.setActive(exports.AnimationType.Focus, true);
    };
    const onBlur = () => {
        var _a;
        (_a = visualElement.animationState) === null || _a === void 0 ? void 0 : _a.setActive(exports.AnimationType.Focus, false);
    };
    useDomEvent(visualElement, "focus", whileFocus ? onFocus : undefined);
    useDomEvent(visualElement, "blur", whileFocus ? onBlur : undefined);
}

function isMouseEvent(event) {
    // PointerEvent inherits from MouseEvent so we can't use a straight instanceof check.
    if (typeof PointerEvent !== "undefined" && event instanceof PointerEvent) {
        return !!(event.pointerType === "mouse");
    }
    return event instanceof MouseEvent;
}
function isTouchEvent(event) {
    const hasTouches = !!event.touches;
    return hasTouches;
}

/**
 * Filters out events not attached to the primary pointer (currently left mouse button)
 * @param eventHandler
 */
function filterPrimaryPointer(eventHandler) {
    return (event) => {
        const isMouseEvent = event instanceof MouseEvent;
        const isPrimaryPointer = !isMouseEvent ||
            (isMouseEvent && event.button === 0);
        if (isPrimaryPointer) {
            eventHandler(event);
        }
    };
}
const defaultPagePoint = { pageX: 0, pageY: 0 };
function pointFromTouch(e, pointType = "page") {
    const primaryTouch = e.touches[0] || e.changedTouches[0];
    const point = primaryTouch || defaultPagePoint;
    return {
        x: point[pointType + "X"],
        y: point[pointType + "Y"],
    };
}
function pointFromMouse(point, pointType = "page") {
    return {
        x: point[pointType + "X"],
        y: point[pointType + "Y"],
    };
}
function extractEventInfo(event, pointType = "page") {
    return {
        point: isTouchEvent(event)
            ? pointFromTouch(event, pointType)
            : pointFromMouse(event, pointType),
    };
}
const wrapHandler = (handler, shouldFilterPrimaryPointer = false) => {
    const listener = (event) => handler(event, extractEventInfo(event));
    return shouldFilterPrimaryPointer
        ? filterPrimaryPointer(listener)
        : listener;
};

// We check for event support via functions in case they've been mocked by a testing suite.
const supportsPointerEvents = () => isBrowser && window.onpointerdown === null;
const supportsTouchEvents = () => isBrowser && window.ontouchstart === null;
const supportsMouseEvents = () => isBrowser && window.onmousedown === null;

const mouseEventNames = {
    pointerdown: "mousedown",
    pointermove: "mousemove",
    pointerup: "mouseup",
    pointercancel: "mousecancel",
    pointerover: "mouseover",
    pointerout: "mouseout",
    pointerenter: "mouseenter",
    pointerleave: "mouseleave",
};
const touchEventNames = {
    pointerdown: "touchstart",
    pointermove: "touchmove",
    pointerup: "touchend",
    pointercancel: "touchcancel",
};
function getPointerEventName(name) {
    if (supportsPointerEvents()) {
        return name;
    }
    else if (supportsTouchEvents()) {
        return touchEventNames[name];
    }
    else if (supportsMouseEvents()) {
        return mouseEventNames[name];
    }
    return name;
}
function addPointerEvent(target, eventName, handler, options) {
    return addDomEvent(target, getPointerEventName(eventName), wrapHandler(handler, eventName === "pointerdown"), options);
}
function usePointerEvent(ref, eventName, handler, options) {
    return useDomEvent(ref, getPointerEventName(eventName), handler && wrapHandler(handler, eventName === "pointerdown"), options);
}

function createLock(name) {
    let lock = null;
    return () => {
        const openLock = () => {
            lock = null;
        };
        if (lock === null) {
            lock = name;
            return openLock;
        }
        return false;
    };
}
const globalHorizontalLock = createLock("dragHorizontal");
const globalVerticalLock = createLock("dragVertical");
function getGlobalLock(drag) {
    let lock = false;
    if (drag === "y") {
        lock = globalVerticalLock();
    }
    else if (drag === "x") {
        lock = globalHorizontalLock();
    }
    else {
        const openHorizontal = globalHorizontalLock();
        const openVertical = globalVerticalLock();
        if (openHorizontal && openVertical) {
            lock = () => {
                openHorizontal();
                openVertical();
            };
        }
        else {
            // Release the locks because we don't use them
            if (openHorizontal)
                openHorizontal();
            if (openVertical)
                openVertical();
        }
    }
    return lock;
}
function isDragActive() {
    // Check the gesture lock - if we get it, it means no drag gesture is active
    // and we can safely fire the tap gesture.
    const openGestureLock = getGlobalLock(true);
    if (!openGestureLock)
        return true;
    openGestureLock();
    return false;
}

function createHoverEvent(visualElement, isActive, callback) {
    return (event, info) => {
        var _a;
        if (!isMouseEvent(event) || isDragActive())
            return;
        /**
         * Ensure we trigger animations before firing event callback
         */
        (_a = visualElement.animationState) === null || _a === void 0 ? void 0 : _a.setActive(exports.AnimationType.Hover, isActive);
        callback === null || callback === void 0 ? void 0 : callback(event, info);
    };
}
function useHoverGesture({ onHoverStart, onHoverEnd, whileHover, visualElement, }) {
    usePointerEvent(visualElement, "pointerenter", onHoverStart || whileHover
        ? createHoverEvent(visualElement, true, onHoverStart)
        : undefined, { passive: !onHoverStart });
    usePointerEvent(visualElement, "pointerleave", onHoverEnd || whileHover
        ? createHoverEvent(visualElement, false, onHoverEnd)
        : undefined, { passive: !onHoverEnd });
}

/**
 * Recursively traverse up the tree to check whether the provided child node
 * is the parent or a descendant of it.
 *
 * @param parent - Element to find
 * @param child - Element to test against parent
 */
const isNodeOrChild = (parent, child) => {
    if (!child) {
        return false;
    }
    else if (parent === child) {
        return true;
    }
    else {
        return isNodeOrChild(parent, child.parentElement);
    }
};

function useUnmountEffect(callback) {
    return React.useEffect(() => () => callback(), []);
}

/**
 * @param handlers -
 * @internal
 */
function useTapGesture({ onTap, onTapStart, onTapCancel, whileTap, visualElement, }) {
    const hasPressListeners = onTap || onTapStart || onTapCancel || whileTap;
    const isPressing = React.useRef(false);
    const cancelPointerEndListeners = React.useRef(null);
    /**
     * Only set listener to passive if there are no external listeners.
     */
    const eventOptions = {
        passive: !(onTapStart || onTap || onTapCancel || onPointerDown),
    };
    function removePointerEndListener() {
        var _a;
        (_a = cancelPointerEndListeners.current) === null || _a === void 0 ? void 0 : _a.call(cancelPointerEndListeners);
        cancelPointerEndListeners.current = null;
    }
    function checkPointerEnd() {
        var _a;
        removePointerEndListener();
        isPressing.current = false;
        (_a = visualElement.animationState) === null || _a === void 0 ? void 0 : _a.setActive(exports.AnimationType.Tap, false);
        return !isDragActive();
    }
    function onPointerUp(event, info) {
        if (!checkPointerEnd())
            return;
        /**
         * We only count this as a tap gesture if the event.target is the same
         * as, or a child of, this component's element
         */
        !isNodeOrChild(visualElement.getInstance(), event.target)
            ? onTapCancel === null || onTapCancel === void 0 ? void 0 : onTapCancel(event, info)
            : onTap === null || onTap === void 0 ? void 0 : onTap(event, info);
    }
    function onPointerCancel(event, info) {
        if (!checkPointerEnd())
            return;
        onTapCancel === null || onTapCancel === void 0 ? void 0 : onTapCancel(event, info);
    }
    function onPointerDown(event, info) {
        var _a;
        removePointerEndListener();
        if (isPressing.current)
            return;
        isPressing.current = true;
        cancelPointerEndListeners.current = popmotion.pipe(addPointerEvent(window, "pointerup", onPointerUp, eventOptions), addPointerEvent(window, "pointercancel", onPointerCancel, eventOptions));
        /**
         * Ensure we trigger animations before firing event callback
         */
        (_a = visualElement.animationState) === null || _a === void 0 ? void 0 : _a.setActive(exports.AnimationType.Tap, true);
        onTapStart === null || onTapStart === void 0 ? void 0 : onTapStart(event, info);
    }
    usePointerEvent(visualElement, "pointerdown", hasPressListeners ? onPointerDown : undefined, eventOptions);
    useUnmountEffect(removePointerEndListener);
}

const warned = new Set();
function warnOnce(condition, message, element) {
    if (condition || warned.has(message))
        return;
    console.warn(message);
    if (element)
        console.warn(element);
    warned.add(message);
}

/**
 * Map an IntersectionHandler callback to an element. We only ever make one handler for one
 * element, so even though these handlers might all be triggered by different
 * observers, we can keep them in the same map.
 */
const observerCallbacks = new WeakMap();
/**
 * Multiple observers can be created for multiple element/document roots. Each with
 * different settings. So here we store dictionaries of observers to each root,
 * using serialised settings (threshold/margin) as lookup keys.
 */
const observers = new WeakMap();
const fireObserverCallback = (entry) => {
    var _a;
    (_a = observerCallbacks.get(entry.target)) === null || _a === void 0 ? void 0 : _a(entry);
};
const fireAllObserverCallbacks = (entries) => {
    entries.forEach(fireObserverCallback);
};
function initIntersectionObserver(_a) {
    var { root } = _a, options = tslib.__rest(_a, ["root"]);
    const lookupRoot = root || document;
    /**
     * If we don't have an observer lookup map for this root, create one.
     */
    if (!observers.has(lookupRoot)) {
        observers.set(lookupRoot, {});
    }
    const rootObservers = observers.get(lookupRoot);
    const key = JSON.stringify(options);
    /**
     * If we don't have an observer for this combination of root and settings,
     * create one.
     */
    if (!rootObservers[key]) {
        rootObservers[key] = new IntersectionObserver(fireAllObserverCallbacks, Object.assign({ root }, options));
    }
    return rootObservers[key];
}
function observeIntersection(element, options, callback) {
    const rootInteresectionObserver = initIntersectionObserver(options);
    observerCallbacks.set(element, callback);
    rootInteresectionObserver.observe(element);
    return () => {
        observerCallbacks.delete(element);
        rootInteresectionObserver.unobserve(element);
    };
}

function useViewport({ visualElement, whileInView, onViewportEnter, onViewportLeave, viewport = {}, }) {
    const state = React.useRef({
        hasEnteredView: false,
        isInView: false,
    });
    let shouldObserve = Boolean(whileInView || onViewportEnter || onViewportLeave);
    if (viewport.once && state.current.hasEnteredView)
        shouldObserve = false;
    const useObserver = typeof IntersectionObserver === "undefined"
        ? useMissingIntersectionObserver
        : useIntersectionObserver;
    useObserver(shouldObserve, state.current, visualElement, viewport);
}
const thresholdNames = {
    some: 0,
    all: 1,
};
function useIntersectionObserver(shouldObserve, state, visualElement, { root, margin: rootMargin, amount = "some", once }) {
    React.useEffect(() => {
        if (!shouldObserve)
            return;
        const options = {
            root: root === null || root === void 0 ? void 0 : root.current,
            rootMargin,
            threshold: typeof amount === "number" ? amount : thresholdNames[amount],
        };
        const intersectionCallback = (entry) => {
            var _a;
            const { isIntersecting } = entry;
            /**
             * If there's been no change in the viewport state, early return.
             */
            if (state.isInView === isIntersecting)
                return;
            state.isInView = isIntersecting;
            /**
             * Handle hasEnteredView. If this is only meant to run once, and
             * element isn't visible, early return. Otherwise set hasEnteredView to true.
             */
            if (once && !isIntersecting && state.hasEnteredView) {
                return;
            }
            else if (isIntersecting) {
                state.hasEnteredView = true;
            }
            (_a = visualElement.animationState) === null || _a === void 0 ? void 0 : _a.setActive(exports.AnimationType.InView, isIntersecting);
            /**
             * Use the latest committed props rather than the ones in scope
             * when this observer is created
             */
            const props = visualElement.getProps();
            const callback = isIntersecting
                ? props.onViewportEnter
                : props.onViewportLeave;
            callback === null || callback === void 0 ? void 0 : callback(entry);
        };
        return observeIntersection(visualElement.getInstance(), options, intersectionCallback);
    }, [shouldObserve, root, rootMargin, amount]);
}
/**
 * If IntersectionObserver is missing, we activate inView and fire onViewportEnter
 * on mount. This way, the page will be in the state the author expects users
 * to see it in for everyone.
 */
function useMissingIntersectionObserver(shouldObserve, state, visualElement, { fallback = true }) {
    React.useEffect(() => {
        if (!shouldObserve || !fallback)
            return;
        if (env !== "production") {
            warnOnce(false, "IntersectionObserver not available on this device. whileInView animations will trigger on mount.");
        }
        /**
         * Fire this in an rAF because, at this point, the animation state
         * won't have flushed for the first time and there's certain logic in
         * there that behaves differently on the initial animation.
         *
         * This hook should be quite rarely called so setting this in an rAF
         * is preferred to changing the behaviour of the animation state.
         */
        requestAnimationFrame(() => {
            var _a;
            state.hasEnteredView = true;
            const { onViewportEnter } = visualElement.getProps();
            onViewportEnter === null || onViewportEnter === void 0 ? void 0 : onViewportEnter(null);
            (_a = visualElement.animationState) === null || _a === void 0 ? void 0 : _a.setActive(exports.AnimationType.InView, true);
        });
    }, [shouldObserve]);
}

const makeRenderlessComponent = (hook) => (props) => {
    hook(props);
    return null;
};

const gestureAnimations = {
    inView: makeRenderlessComponent(useViewport),
    tap: makeRenderlessComponent(useTapGesture),
    focus: makeRenderlessComponent(useFocusGesture),
    hover: makeRenderlessComponent(useHoverGesture),
};

/**
 * When a component is the child of `AnimatePresence`, it can use `usePresence`
 * to access information about whether it's still present in the React tree.
 *
 * ```jsx
 * import { usePresence } from "framer-motion"
 *
 * export const Component = () => {
 *   const [isPresent, safeToRemove] = usePresence()
 *
 *   useEffect(() => {
 *     !isPresent && setTimeout(safeToRemove, 1000)
 *   }, [isPresent])
 *
 *   return <div />
 * }
 * ```
 *
 * If `isPresent` is `false`, it means that a component has been removed the tree, but
 * `AnimatePresence` won't really remove it until `safeToRemove` has been called.
 *
 * @public
 */
function usePresence() {
    const context = React.useContext(PresenceContext);
    if (context === null)
        return [true, null];
    const { isPresent, onExitComplete, register } = context;
    // It's safe to call the following hooks conditionally (after an early return) because the context will always
    // either be null or non-null for the lifespan of the component.
    // Replace with useId when released in React
    const id = React.useId();
    React.useEffect(() => register(id), []);
    const safeToRemove = () => onExitComplete === null || onExitComplete === void 0 ? void 0 : onExitComplete(id);
    return !isPresent && onExitComplete ? [false, safeToRemove] : [true];
}
/**
 * Similar to `usePresence`, except `useIsPresent` simply returns whether or not the component is present.
 * There is no `safeToRemove` function.
 *
 * ```jsx
 * import { useIsPresent } from "framer-motion"
 *
 * export const Component = () => {
 *   const isPresent = useIsPresent()
 *
 *   useEffect(() => {
 *     !isPresent && console.log("I've been removed!")
 *   }, [isPresent])
 *
 *   return <div />
 * }
 * ```
 *
 * @public
 */
function useIsPresent() {
    return isPresent(React.useContext(PresenceContext));
}
function isPresent(context) {
    return context === null ? true : context.isPresent;
}

function shallowCompare(next, prev) {
    if (!Array.isArray(prev))
        return false;
    const prevLength = prev.length;
    if (prevLength !== next.length)
        return false;
    for (let i = 0; i < prevLength; i++) {
        if (prev[i] !== next[i])
            return false;
    }
    return true;
}

/**
 * Converts seconds to milliseconds
 *
 * @param seconds - Time in seconds.
 * @return milliseconds - Converted time in milliseconds.
 */
const secondsToMilliseconds = (seconds) => seconds * 1000;

const easingLookup = {
    linear: popmotion.linear,
    easeIn: popmotion.easeIn,
    easeInOut: popmotion.easeInOut,
    easeOut: popmotion.easeOut,
    circIn: popmotion.circIn,
    circInOut: popmotion.circInOut,
    circOut: popmotion.circOut,
    backIn: popmotion.backIn,
    backInOut: popmotion.backInOut,
    backOut: popmotion.backOut,
    anticipate: popmotion.anticipate,
    bounceIn: popmotion.bounceIn,
    bounceInOut: popmotion.bounceInOut,
    bounceOut: popmotion.bounceOut,
};
const easingDefinitionToFunction = (definition) => {
    if (Array.isArray(definition)) {
        // If cubic bezier definition, create bezier curve
        heyListen.invariant(definition.length === 4, `Cubic bezier arrays must contain four numerical values.`);
        const [x1, y1, x2, y2] = definition;
        return popmotion.cubicBezier(x1, y1, x2, y2);
    }
    else if (typeof definition === "string") {
        // Else lookup from table
        heyListen.invariant(easingLookup[definition] !== undefined, `Invalid easing type '${definition}'`);
        return easingLookup[definition];
    }
    return definition;
};
const isEasingArray = (ease) => {
    return Array.isArray(ease) && typeof ease[0] !== "number";
};

/**
 * Check if a value is animatable. Examples:
 *
 * ???: 100, "100px", "#fff"
 * ???: "block", "url(2.jpg)"
 * @param value
 *
 * @internal
 */
const isAnimatable = (key, value) => {
    // If the list of keys tat might be non-animatable grows, replace with Set
    if (key === "zIndex")
        return false;
    // If it's a number or a keyframes array, we can animate it. We might at some point
    // need to do a deep isAnimatable check of keyframes, or let Popmotion handle this,
    // but for now lets leave it like this for performance reasons
    if (typeof value === "number" || Array.isArray(value))
        return true;
    if (typeof value === "string" && // It's animatable if we have a string
        styleValueTypes.complex.test(value) && // And it contains numbers and/or colors
        !value.startsWith("url(") // Unless it starts with "url("
    ) {
        return true;
    }
    return false;
};

const underDampedSpring = () => ({
    type: "spring",
    stiffness: 500,
    damping: 25,
    restSpeed: 10,
});
const criticallyDampedSpring = (to) => ({
    type: "spring",
    stiffness: 550,
    damping: to === 0 ? 2 * Math.sqrt(550) : 30,
    restSpeed: 10,
});
const linearTween = () => ({
    type: "keyframes",
    ease: "linear",
    duration: 0.3,
});
const keyframes = (values) => ({
    type: "keyframes",
    duration: 0.8,
    values,
});
const defaultTransitions = {
    x: underDampedSpring,
    y: underDampedSpring,
    z: underDampedSpring,
    rotate: underDampedSpring,
    rotateX: underDampedSpring,
    rotateY: underDampedSpring,
    rotateZ: underDampedSpring,
    scaleX: criticallyDampedSpring,
    scaleY: criticallyDampedSpring,
    scale: criticallyDampedSpring,
    opacity: linearTween,
    backgroundColor: linearTween,
    color: linearTween,
    default: criticallyDampedSpring,
};
const getDefaultTransition = (valueKey, to) => {
    let transitionFactory;
    if (isKeyframesTarget(to)) {
        transitionFactory = keyframes;
    }
    else {
        transitionFactory =
            defaultTransitions[valueKey] || defaultTransitions.default;
    }
    return Object.assign({ to }, transitionFactory(to));
};

/**
 * A map of default value types for common values
 */
const defaultValueTypes = Object.assign(Object.assign({}, numberValueTypes), { 
    // Color props
    color: styleValueTypes.color, backgroundColor: styleValueTypes.color, outlineColor: styleValueTypes.color, fill: styleValueTypes.color, stroke: styleValueTypes.color, 
    // Border props
    borderColor: styleValueTypes.color, borderTopColor: styleValueTypes.color, borderRightColor: styleValueTypes.color, borderBottomColor: styleValueTypes.color, borderLeftColor: styleValueTypes.color, filter: styleValueTypes.filter, WebkitFilter: styleValueTypes.filter });
/**
 * Gets the default ValueType for the provided value key
 */
const getDefaultValueType = (key) => defaultValueTypes[key];

function getAnimatableNone(key, value) {
    var _a;
    let defaultValueType = getDefaultValueType(key);
    if (defaultValueType !== styleValueTypes.filter)
        defaultValueType = styleValueTypes.complex;
    // If value is not recognised as animatable, ie "none", create an animatable version origin based on the target
    return (_a = defaultValueType.getAnimatableNone) === null || _a === void 0 ? void 0 : _a.call(defaultValueType, value);
}

const instantAnimationState = {
    current: false,
};

/**
 * Decide whether a transition is defined on a given Transition.
 * This filters out orchestration options and returns true
 * if any options are left.
 */
function isTransitionDefined(_a) {
    var transition = tslib.__rest(_a, ["when", "delay", "delayChildren", "staggerChildren", "staggerDirection", "repeat", "repeatType", "repeatDelay", "from"]);
    return !!Object.keys(transition).length;
}
let legacyRepeatWarning = false;
/**
 * Convert Framer Motion's Transition type into Popmotion-compatible options.
 */
function convertTransitionToAnimationOptions(_a) {
    var { ease, times, yoyo, flip, loop } = _a, transition = tslib.__rest(_a, ["ease", "times", "yoyo", "flip", "loop"]);
    const options = Object.assign({}, transition);
    if (times)
        options["offset"] = times;
    /**
     * Convert any existing durations from seconds to milliseconds
     */
    if (transition.duration)
        options["duration"] = secondsToMilliseconds(transition.duration);
    if (transition.repeatDelay)
        options.repeatDelay = secondsToMilliseconds(transition.repeatDelay);
    /**
     * Map easing names to Popmotion's easing functions
     */
    if (ease) {
        options["ease"] = isEasingArray(ease)
            ? ease.map(easingDefinitionToFunction)
            : easingDefinitionToFunction(ease);
    }
    /**
     * Support legacy transition API
     */
    if (transition.type === "tween")
        options.type = "keyframes";
    /**
     * TODO: These options are officially removed from the API.
     */
    if (yoyo || loop || flip) {
        heyListen.warning(!legacyRepeatWarning, "yoyo, loop and flip have been removed from the API. Replace with repeat and repeatType options.");
        legacyRepeatWarning = true;
        if (yoyo) {
            options.repeatType = "reverse";
        }
        else if (loop) {
            options.repeatType = "loop";
        }
        else if (flip) {
            options.repeatType = "mirror";
        }
        options.repeat = loop || yoyo || flip || transition.repeat;
    }
    /**
     * TODO: Popmotion 9 has the ability to automatically detect whether to use
     * a keyframes or spring animation, but does so by detecting velocity and other spring options.
     * It'd be good to introduce a similar thing here.
     */
    if (transition.type !== "spring")
        options.type = "keyframes";
    return options;
}
/**
 * Get the delay for a value by checking Transition with decreasing specificity.
 */
function getDelayFromTransition(transition, key) {
    var _a, _b;
    const valueTransition = getValueTransition(transition, key) || {};
    return (_b = (_a = valueTransition.delay) !== null && _a !== void 0 ? _a : transition.delay) !== null && _b !== void 0 ? _b : 0;
}
function hydrateKeyframes(options) {
    if (Array.isArray(options.to) && options.to[0] === null) {
        options.to = [...options.to];
        options.to[0] = options.from;
    }
    return options;
}
function getPopmotionAnimationOptions(transition, options, key) {
    var _a;
    if (Array.isArray(options.to)) {
        (_a = transition.duration) !== null && _a !== void 0 ? _a : (transition.duration = 0.8);
    }
    hydrateKeyframes(options);
    /**
     * Get a default transition if none is determined to be defined.
     */
    if (!isTransitionDefined(transition)) {
        transition = Object.assign(Object.assign({}, transition), getDefaultTransition(key, options.to));
    }
    return Object.assign(Object.assign({}, options), convertTransitionToAnimationOptions(transition));
}
/**
 *
 */
function getAnimation(key, value, target, transition, onComplete) {
    var _a;
    const valueTransition = getValueTransition(transition, key);
    let origin = (_a = valueTransition.from) !== null && _a !== void 0 ? _a : value.get();
    const isTargetAnimatable = isAnimatable(key, target);
    if (origin === "none" && isTargetAnimatable && typeof target === "string") {
        /**
         * If we're trying to animate from "none", try and get an animatable version
         * of the target. This could be improved to work both ways.
         */
        origin = getAnimatableNone(key, target);
    }
    else if (isZero(origin) && typeof target === "string") {
        origin = getZeroUnit(target);
    }
    else if (!Array.isArray(target) &&
        isZero(target) &&
        typeof origin === "string") {
        target = getZeroUnit(origin);
    }
    const isOriginAnimatable = isAnimatable(key, origin);
    heyListen.warning(isOriginAnimatable === isTargetAnimatable, `You are trying to animate ${key} from "${origin}" to "${target}". ${origin} is not an animatable value - to enable this animation set ${origin} to a value animatable to ${target} via the \`style\` property.`);
    function start() {
        const options = {
            from: origin,
            to: target,
            velocity: value.getVelocity(),
            onComplete,
            onUpdate: (v) => value.set(v),
        };
        return valueTransition.type === "inertia" ||
            valueTransition.type === "decay"
            ? popmotion.inertia(Object.assign(Object.assign({}, options), valueTransition))
            : popmotion.animate(Object.assign(Object.assign({}, getPopmotionAnimationOptions(valueTransition, options, key)), { onUpdate: (v) => {
                    var _a;
                    options.onUpdate(v);
                    (_a = valueTransition.onUpdate) === null || _a === void 0 ? void 0 : _a.call(valueTransition, v);
                }, onComplete: () => {
                    var _a;
                    options.onComplete();
                    (_a = valueTransition.onComplete) === null || _a === void 0 ? void 0 : _a.call(valueTransition);
                } }));
    }
    function set() {
        var _a, _b;
        const finalTarget = resolveFinalValueInKeyframes(target);
        value.set(finalTarget);
        onComplete();
        (_a = valueTransition === null || valueTransition === void 0 ? void 0 : valueTransition.onUpdate) === null || _a === void 0 ? void 0 : _a.call(valueTransition, finalTarget);
        (_b = valueTransition === null || valueTransition === void 0 ? void 0 : valueTransition.onComplete) === null || _b === void 0 ? void 0 : _b.call(valueTransition);
        return { stop: () => { } };
    }
    return !isOriginAnimatable ||
        !isTargetAnimatable ||
        valueTransition.type === false
        ? set
        : start;
}
function isZero(value) {
    return (value === 0 ||
        (typeof value === "string" &&
            parseFloat(value) === 0 &&
            value.indexOf(" ") === -1));
}
function getZeroUnit(potentialUnitType) {
    return typeof potentialUnitType === "number"
        ? 0
        : getAnimatableNone("", potentialUnitType);
}
function getValueTransition(transition, key) {
    return transition[key] || transition["default"] || transition;
}
/**
 * Start animation on a MotionValue. This function is an interface between
 * Framer Motion and Popmotion
 */
function startAnimation(key, value, target, transition = {}) {
    if (instantAnimationState.current) {
        transition = { type: false };
    }
    return value.start((onComplete) => {
        let delayTimer;
        let controls;
        const animation = getAnimation(key, value, target, transition, onComplete);
        const delay = getDelayFromTransition(transition, key);
        const start = () => (controls = animation());
        if (delay) {
            delayTimer = window.setTimeout(start, secondsToMilliseconds(delay));
        }
        else {
            start();
        }
        return () => {
            clearTimeout(delayTimer);
            controls === null || controls === void 0 ? void 0 : controls.stop();
        };
    });
}

/**
 * Check if value is a numerical string, ie a string that is purely a number eg "100" or "-100.1"
 */
const isNumericalString = (v) => /^\-?\d*\.?\d+$/.test(v);

/**
 * Check if the value is a zero value string like "0px" or "0%"
 */
const isZeroValueString = (v) => /^0[^.\s]+$/.test(v);

function addUniqueItem(arr, item) {
    if (arr.indexOf(item) === -1)
        arr.push(item);
}
function removeItem(arr, item) {
    const index = arr.indexOf(item);
    if (index > -1)
        arr.splice(index, 1);
}
// Adapted from array-move
function moveItem([...arr], fromIndex, toIndex) {
    const startIndex = fromIndex < 0 ? arr.length + fromIndex : fromIndex;
    if (startIndex >= 0 && startIndex < arr.length) {
        const endIndex = toIndex < 0 ? arr.length + toIndex : toIndex;
        const [item] = arr.splice(fromIndex, 1);
        arr.splice(endIndex, 0, item);
    }
    return arr;
}

class SubscriptionManager {
    constructor() {
        this.subscriptions = [];
    }
    add(handler) {
        addUniqueItem(this.subscriptions, handler);
        return () => removeItem(this.subscriptions, handler);
    }
    notify(a, b, c) {
        const numSubscriptions = this.subscriptions.length;
        if (!numSubscriptions)
            return;
        if (numSubscriptions === 1) {
            /**
             * If there's only a single handler we can just call it without invoking a loop.
             */
            this.subscriptions[0](a, b, c);
        }
        else {
            for (let i = 0; i < numSubscriptions; i++) {
                /**
                 * Check whether the handler exists before firing as it's possible
                 * the subscriptions were modified during this loop running.
                 */
                const handler = this.subscriptions[i];
                handler && handler(a, b, c);
            }
        }
    }
    getSize() {
        return this.subscriptions.length;
    }
    clear() {
        this.subscriptions.length = 0;
    }
}

const isFloat = (value) => {
    return !isNaN(parseFloat(value));
};
/**
 * `MotionValue` is used to track the state and velocity of motion values.
 *
 * @public
 */
class MotionValue {
    /**
     * @param init - The initiating value
     * @param config - Optional configuration options
     *
     * -  `transformer`: A function to transform incoming values with.
     *
     * @internal
     */
    constructor(init) {
        /**
         * This will be replaced by the build step with the latest version number.
         * When MotionValues are provided to motion components, warn if versions are mixed.
         */
        this.version = "7.2.0";
        /**
         * Duration, in milliseconds, since last updating frame.
         *
         * @internal
         */
        this.timeDelta = 0;
        /**
         * Timestamp of the last time this `MotionValue` was updated.
         *
         * @internal
         */
        this.lastUpdated = 0;
        /**
         * Functions to notify when the `MotionValue` updates.
         *
         * @internal
         */
        this.updateSubscribers = new SubscriptionManager();
        /**
         * Functions to notify when the velocity updates.
         *
         * @internal
         */
        this.velocityUpdateSubscribers = new SubscriptionManager();
        /**
         * Functions to notify when the `MotionValue` updates and `render` is set to `true`.
         *
         * @internal
         */
        this.renderSubscribers = new SubscriptionManager();
        /**
         * Tracks whether this value can output a velocity. Currently this is only true
         * if the value is numerical, but we might be able to widen the scope here and support
         * other value types.
         *
         * @internal
         */
        this.canTrackVelocity = false;
        this.updateAndNotify = (v, render = true) => {
            this.prev = this.current;
            this.current = v;
            // Update timestamp
            const { delta, timestamp } = sync.getFrameData();
            if (this.lastUpdated !== timestamp) {
                this.timeDelta = delta;
                this.lastUpdated = timestamp;
                sync__default["default"].postRender(this.scheduleVelocityCheck);
            }
            // Update update subscribers
            if (this.prev !== this.current) {
                this.updateSubscribers.notify(this.current);
            }
            // Update velocity subscribers
            if (this.velocityUpdateSubscribers.getSize()) {
                this.velocityUpdateSubscribers.notify(this.getVelocity());
            }
            // Update render subscribers
            if (render) {
                this.renderSubscribers.notify(this.current);
            }
        };
        /**
         * Schedule a velocity check for the next frame.
         *
         * This is an instanced and bound function to prevent generating a new
         * function once per frame.
         *
         * @internal
         */
        this.scheduleVelocityCheck = () => sync__default["default"].postRender(this.velocityCheck);
        /**
         * Updates `prev` with `current` if the value hasn't been updated this frame.
         * This ensures velocity calculations return `0`.
         *
         * This is an instanced and bound function to prevent generating a new
         * function once per frame.
         *
         * @internal
         */
        this.velocityCheck = ({ timestamp }) => {
            if (timestamp !== this.lastUpdated) {
                this.prev = this.current;
                this.velocityUpdateSubscribers.notify(this.getVelocity());
            }
        };
        this.hasAnimated = false;
        this.prev = this.current = init;
        this.canTrackVelocity = isFloat(this.current);
    }
    /**
     * Adds a function that will be notified when the `MotionValue` is updated.
     *
     * It returns a function that, when called, will cancel the subscription.
     *
     * When calling `onChange` inside a React component, it should be wrapped with the
     * `useEffect` hook. As it returns an unsubscribe function, this should be returned
     * from the `useEffect` function to ensure you don't add duplicate subscribers..
     *
     * ```jsx
     * export const MyComponent = () => {
     *   const x = useMotionValue(0)
     *   const y = useMotionValue(0)
     *   const opacity = useMotionValue(1)
     *
     *   useEffect(() => {
     *     function updateOpacity() {
     *       const maxXY = Math.max(x.get(), y.get())
     *       const newOpacity = transform(maxXY, [0, 100], [1, 0])
     *       opacity.set(newOpacity)
     *     }
     *
     *     const unsubscribeX = x.onChange(updateOpacity)
     *     const unsubscribeY = y.onChange(updateOpacity)
     *
     *     return () => {
     *       unsubscribeX()
     *       unsubscribeY()
     *     }
     *   }, [])
     *
     *   return <motion.div style={{ x }} />
     * }
     * ```
     *
     * @privateRemarks
     *
     * We could look into a `useOnChange` hook if the above lifecycle management proves confusing.
     *
     * ```jsx
     * useOnChange(x, () => {})
     * ```
     *
     * @param subscriber - A function that receives the latest value.
     * @returns A function that, when called, will cancel this subscription.
     *
     * @public
     */
    onChange(subscription) {
        return this.updateSubscribers.add(subscription);
    }
    clearListeners() {
        this.updateSubscribers.clear();
    }
    /**
     * Adds a function that will be notified when the `MotionValue` requests a render.
     *
     * @param subscriber - A function that's provided the latest value.
     * @returns A function that, when called, will cancel this subscription.
     *
     * @internal
     */
    onRenderRequest(subscription) {
        // Render immediately
        subscription(this.get());
        return this.renderSubscribers.add(subscription);
    }
    /**
     * Attaches a passive effect to the `MotionValue`.
     *
     * @internal
     */
    attach(passiveEffect) {
        this.passiveEffect = passiveEffect;
    }
    /**
     * Sets the state of the `MotionValue`.
     *
     * @remarks
     *
     * ```jsx
     * const x = useMotionValue(0)
     * x.set(10)
     * ```
     *
     * @param latest - Latest value to set.
     * @param render - Whether to notify render subscribers. Defaults to `true`
     *
     * @public
     */
    set(v, render = true) {
        if (!render || !this.passiveEffect) {
            this.updateAndNotify(v, render);
        }
        else {
            this.passiveEffect(v, this.updateAndNotify);
        }
    }
    /**
     * Returns the latest state of `MotionValue`
     *
     * @returns - The latest state of `MotionValue`
     *
     * @public
     */
    get() {
        return this.current;
    }
    /**
     * @public
     */
    getPrevious() {
        return this.prev;
    }
    /**
     * Returns the latest velocity of `MotionValue`
     *
     * @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
     *
     * @public
     */
    getVelocity() {
        // This could be isFloat(this.prev) && isFloat(this.current), but that would be wasteful
        return this.canTrackVelocity
            ? // These casts could be avoided if parseFloat would be typed better
                popmotion.velocityPerSecond(parseFloat(this.current) -
                    parseFloat(this.prev), this.timeDelta)
            : 0;
    }
    /**
     * Registers a new animation to control this `MotionValue`. Only one
     * animation can drive a `MotionValue` at one time.
     *
     * ```jsx
     * value.start()
     * ```
     *
     * @param animation - A function that starts the provided animation
     *
     * @internal
     */
    start(animation) {
        this.stop();
        return new Promise((resolve) => {
            this.hasAnimated = true;
            this.stopAnimation = animation(resolve);
        }).then(() => this.clearAnimation());
    }
    /**
     * Stop the currently active animation.
     *
     * @public
     */
    stop() {
        if (this.stopAnimation)
            this.stopAnimation();
        this.clearAnimation();
    }
    /**
     * Returns `true` if this value is currently animating.
     *
     * @public
     */
    isAnimating() {
        return !!this.stopAnimation;
    }
    clearAnimation() {
        this.stopAnimation = null;
    }
    /**
     * Destroy and clean up subscribers to this `MotionValue`.
     *
     * The `MotionValue` hooks like `useMotionValue` and `useTransform` automatically
     * handle the lifecycle of the returned `MotionValue`, so this method is only necessary if you've manually
     * created a `MotionValue` via the `motionValue` function.
     *
     * @public
     */
    destroy() {
        this.updateSubscribers.clear();
        this.renderSubscribers.clear();
        this.stop();
    }
}
function motionValue(init) {
    return new MotionValue(init);
}

/**
 * Tests a provided value against a ValueType
 */
const testValueType = (v) => (type) => type.test(v);

/**
 * ValueType for "auto"
 */
const auto = {
    test: (v) => v === "auto",
    parse: (v) => v,
};

/**
 * A list of value types commonly used for dimensions
 */
const dimensionValueTypes = [styleValueTypes.number, styleValueTypes.px, styleValueTypes.percent, styleValueTypes.degrees, styleValueTypes.vw, styleValueTypes.vh, auto];
/**
 * Tests a dimensional value against the list of dimension ValueTypes
 */
const findDimensionValueType = (v) => dimensionValueTypes.find(testValueType(v));

/**
 * A list of all ValueTypes
 */
const valueTypes = [...dimensionValueTypes, styleValueTypes.color, styleValueTypes.complex];
/**
 * Tests a value against the list of ValueTypes
 */
const findValueType = (v) => valueTypes.find(testValueType(v));

/**
 * Set VisualElement's MotionValue, creating a new MotionValue for it if
 * it doesn't exist.
 */
function setMotionValue(visualElement, key, value) {
    if (visualElement.hasValue(key)) {
        visualElement.getValue(key).set(value);
    }
    else {
        visualElement.addValue(key, motionValue(value));
    }
}
function setTarget(visualElement, definition) {
    const resolved = resolveVariant(visualElement, definition);
    let _a = resolved ? visualElement.makeTargetAnimatable(resolved, false) : {}, { transitionEnd = {}, transition = {} } = _a, target = tslib.__rest(_a, ["transitionEnd", "transition"]);
    target = Object.assign(Object.assign({}, target), transitionEnd);
    for (const key in target) {
        const value = resolveFinalValueInKeyframes(target[key]);
        setMotionValue(visualElement, key, value);
    }
}
function setVariants(visualElement, variantLabels) {
    const reversedLabels = [...variantLabels].reverse();
    reversedLabels.forEach((key) => {
        var _a;
        const variant = visualElement.getVariant(key);
        variant && setTarget(visualElement, variant);
        (_a = visualElement.variantChildren) === null || _a === void 0 ? void 0 : _a.forEach((child) => {
            setVariants(child, variantLabels);
        });
    });
}
function setValues(visualElement, definition) {
    if (Array.isArray(definition)) {
        return setVariants(visualElement, definition);
    }
    else if (typeof definition === "string") {
        return setVariants(visualElement, [definition]);
    }
    else {
        setTarget(visualElement, definition);
    }
}
function checkTargetForNewValues(visualElement, target, origin) {
    var _a, _b, _c;
    var _d;
    const newValueKeys = Object.keys(target).filter((key) => !visualElement.hasValue(key));
    const numNewValues = newValueKeys.length;
    if (!numNewValues)
        return;
    for (let i = 0; i < numNewValues; i++) {
        const key = newValueKeys[i];
        const targetValue = target[key];
        let value = null;
        /**
         * If the target is a series of keyframes, we can use the first value
         * in the array. If this first value is null, we'll still need to read from the DOM.
         */
        if (Array.isArray(targetValue)) {
            value = targetValue[0];
        }
        /**
         * If the target isn't keyframes, or the first keyframe was null, we need to
         * first check if an origin value was explicitly defined in the transition as "from",
         * if not read the value from the DOM. As an absolute fallback, take the defined target value.
         */
        if (value === null) {
            value = (_b = (_a = origin[key]) !== null && _a !== void 0 ? _a : visualElement.readValue(key)) !== null && _b !== void 0 ? _b : target[key];
        }
        /**
         * If value is still undefined or null, ignore it. Preferably this would throw,
         * but this was causing issues in Framer.
         */
        if (value === undefined || value === null)
            continue;
        if (typeof value === "string" &&
            (isNumericalString(value) || isZeroValueString(value))) {
            // If this is a number read as a string, ie "0" or "200", convert it to a number
            value = parseFloat(value);
        }
        else if (!findValueType(value) && styleValueTypes.complex.test(targetValue)) {
            value = getAnimatableNone(key, targetValue);
        }
        visualElement.addValue(key, motionValue(value));
        (_c = (_d = origin)[key]) !== null && _c !== void 0 ? _c : (_d[key] = value);
        visualElement.setBaseTarget(key, value);
    }
}
function getOriginFromTransition(key, transition) {
    if (!transition)
        return;
    const valueTransition = transition[key] || transition["default"] || transition;
    return valueTransition.from;
}
function getOrigin(target, transition, visualElement) {
    var _a, _b;
    const origin = {};
    for (const key in target) {
        origin[key] =
            (_a = getOriginFromTransition(key, transition)) !== null && _a !== void 0 ? _a : (_b = visualElement.getValue(key)) === null || _b === void 0 ? void 0 : _b.get();
    }
    return origin;
}

function isWillChangeMotionValue(value) {
    return Boolean(isMotionValue(value) && value.add);
}

function animateVisualElement(visualElement, definition, options = {}) {
    visualElement.notifyAnimationStart(definition);
    let animation;
    if (Array.isArray(definition)) {
        const animations = definition.map((variant) => animateVariant(visualElement, variant, options));
        animation = Promise.all(animations);
    }
    else if (typeof definition === "string") {
        animation = animateVariant(visualElement, definition, options);
    }
    else {
        const resolvedDefinition = typeof definition === "function"
            ? resolveVariant(visualElement, definition, options.custom)
            : definition;
        animation = animateTarget(visualElement, resolvedDefinition, options);
    }
    return animation.then(() => visualElement.notifyAnimationComplete(definition));
}
function animateVariant(visualElement, variant, options = {}) {
    var _a;
    const resolved = resolveVariant(visualElement, variant, options.custom);
    let { transition = visualElement.getDefaultTransition() || {} } = resolved || {};
    if (options.transitionOverride) {
        transition = options.transitionOverride;
    }
    /**
     * If we have a variant, create a callback that runs it as an animation.
     * Otherwise, we resolve a Promise immediately for a composable no-op.
     */
    const getAnimation = resolved
        ? () => animateTarget(visualElement, resolved, options)
        : () => Promise.resolve();
    /**
     * If we have children, create a callback that runs all their animations.
     * Otherwise, we resolve a Promise immediately for a composable no-op.
     */
    const getChildAnimations = ((_a = visualElement.variantChildren) === null || _a === void 0 ? void 0 : _a.size)
        ? (forwardDelay = 0) => {
            const { delayChildren = 0, staggerChildren, staggerDirection, } = transition;
            return animateChildren(visualElement, variant, delayChildren + forwardDelay, staggerChildren, staggerDirection, options);
        }
        : () => Promise.resolve();
    /**
     * If the transition explicitly defines a "when" option, we need to resolve either
     * this animation or all children animations before playing the other.
     */
    const { when } = transition;
    if (when) {
        const [first, last] = when === "beforeChildren"
            ? [getAnimation, getChildAnimations]
            : [getChildAnimations, getAnimation];
        return first().then(last);
    }
    else {
        return Promise.all([getAnimation(), getChildAnimations(options.delay)]);
    }
}
/**
 * @internal
 */
function animateTarget(visualElement, definition, { delay = 0, transitionOverride, type } = {}) {
    var _a;
    let _b = visualElement.makeTargetAnimatable(definition), { transition = visualElement.getDefaultTransition(), transitionEnd } = _b, target = tslib.__rest(_b, ["transition", "transitionEnd"]);
    const willChange = visualElement.getValue("willChange");
    if (transitionOverride)
        transition = transitionOverride;
    const animations = [];
    const animationTypeState = type && ((_a = visualElement.animationState) === null || _a === void 0 ? void 0 : _a.getState()[type]);
    for (const key in target) {
        const value = visualElement.getValue(key);
        const valueTarget = target[key];
        if (!value ||
            valueTarget === undefined ||
            (animationTypeState &&
                shouldBlockAnimation(animationTypeState, key))) {
            continue;
        }
        let valueTransition = Object.assign({ delay }, transition);
        /**
         * Make animation instant if this is a transform prop and we should reduce motion.
         */
        if (visualElement.shouldReduceMotion && isTransformProp(key)) {
            valueTransition = Object.assign(Object.assign({}, valueTransition), { type: false, delay: 0 });
        }
        let animation = startAnimation(key, value, valueTarget, valueTransition);
        if (isWillChangeMotionValue(willChange)) {
            willChange.add(key);
            animation = animation.then(() => willChange.remove(key));
        }
        animations.push(animation);
    }
    return Promise.all(animations).then(() => {
        transitionEnd && setTarget(visualElement, transitionEnd);
    });
}
function animateChildren(visualElement, variant, delayChildren = 0, staggerChildren = 0, staggerDirection = 1, options) {
    const animations = [];
    const maxStaggerDuration = (visualElement.variantChildren.size - 1) * staggerChildren;
    const generateStaggerDuration = staggerDirection === 1
        ? (i = 0) => i * staggerChildren
        : (i = 0) => maxStaggerDuration - i * staggerChildren;
    Array.from(visualElement.variantChildren)
        .sort(sortByTreeOrder)
        .forEach((child, i) => {
        animations.push(animateVariant(child, variant, Object.assign(Object.assign({}, options), { delay: delayChildren + generateStaggerDuration(i) })).then(() => child.notifyAnimationComplete(variant)));
    });
    return Promise.all(animations);
}
function stopAnimation(visualElement) {
    visualElement.forEachValue((value) => value.stop());
}
function sortByTreeOrder(a, b) {
    return a.sortNodePosition(b);
}
/**
 * Decide whether we should block this animation. Previously, we achieved this
 * just by checking whether the key was listed in protectedKeys, but this
 * posed problems if an animation was triggered by afterChildren and protectedKeys
 * had been set to true in the meantime.
 */
function shouldBlockAnimation({ protectedKeys, needsAnimating }, key) {
    const shouldBlock = protectedKeys.hasOwnProperty(key) && needsAnimating[key] !== true;
    needsAnimating[key] = false;
    return shouldBlock;
}

const variantPriorityOrder = [
    exports.AnimationType.Animate,
    exports.AnimationType.InView,
    exports.AnimationType.Focus,
    exports.AnimationType.Hover,
    exports.AnimationType.Tap,
    exports.AnimationType.Drag,
    exports.AnimationType.Exit,
];
const reversePriorityOrder = [...variantPriorityOrder].reverse();
const numAnimationTypes = variantPriorityOrder.length;
function animateList(visualElement) {
    return (animations) => Promise.all(animations.map(({ animation, options }) => animateVisualElement(visualElement, animation, options)));
}
function createAnimationState(visualElement) {
    let animate = animateList(visualElement);
    const state = createState();
    let isInitialRender = true;
    /**
     * This function will be used to reduce the animation definitions for
     * each active animation type into an object of resolved values for it.
     */
    const buildResolvedTypeValues = (acc, definition) => {
        const resolved = resolveVariant(visualElement, definition);
        if (resolved) {
            const { transition, transitionEnd } = resolved, target = tslib.__rest(resolved, ["transition", "transitionEnd"]);
            acc = Object.assign(Object.assign(Object.assign({}, acc), target), transitionEnd);
        }
        return acc;
    };
    /**
     * This just allows us to inject mocked animation functions
     * @internal
     */
    function setAnimateFunction(makeAnimator) {
        animate = makeAnimator(visualElement);
    }
    /**
     * When we receive new props, we need to:
     * 1. Create a list of protected keys for each type. This is a directory of
     *    value keys that are currently being "handled" by types of a higher priority
     *    so that whenever an animation is played of a given type, these values are
     *    protected from being animated.
     * 2. Determine if an animation type needs animating.
     * 3. Determine if any values have been removed from a type and figure out
     *    what to animate those to.
     */
    function animateChanges(options, changedActiveType) {
        var _a;
        const props = visualElement.getProps();
        const context = visualElement.getVariantContext(true) || {};
        /**
         * A list of animations that we'll build into as we iterate through the animation
         * types. This will get executed at the end of the function.
         */
        const animations = [];
        /**
         * Keep track of which values have been removed. Then, as we hit lower priority
         * animation types, we can check if they contain removed values and animate to that.
         */
        const removedKeys = new Set();
        /**
         * A dictionary of all encountered keys. This is an object to let us build into and
         * copy it without iteration. Each time we hit an animation type we set its protected
         * keys - the keys its not allowed to animate - to the latest version of this object.
         */
        let encounteredKeys = {};
        /**
         * If a variant has been removed at a given index, and this component is controlling
         * variant animations, we want to ensure lower-priority variants are forced to animate.
         */
        let removedVariantIndex = Infinity;
        /**
         * Iterate through all animation types in reverse priority order. For each, we want to
         * detect which values it's handling and whether or not they've changed (and therefore
         * need to be animated). If any values have been removed, we want to detect those in
         * lower priority props and flag for animation.
         */
        for (let i = 0; i < numAnimationTypes; i++) {
            const type = reversePriorityOrder[i];
            const typeState = state[type];
            const prop = (_a = props[type]) !== null && _a !== void 0 ? _a : context[type];
            const propIsVariant = isVariantLabel(prop);
            /**
             * If this type has *just* changed isActive status, set activeDelta
             * to that status. Otherwise set to null.
             */
            const activeDelta = type === changedActiveType ? typeState.isActive : null;
            if (activeDelta === false)
                removedVariantIndex = i;
            /**
             * If this prop is an inherited variant, rather than been set directly on the
             * component itself, we want to make sure we allow the parent to trigger animations.
             *
             * TODO: Can probably change this to a !isControllingVariants check
             */
            let isInherited = prop === context[type] && prop !== props[type] && propIsVariant;
            /**
             *
             */
            if (isInherited &&
                isInitialRender &&
                visualElement.manuallyAnimateOnMount) {
                isInherited = false;
            }
            /**
             * Set all encountered keys so far as the protected keys for this type. This will
             * be any key that has been animated or otherwise handled by active, higher-priortiy types.
             */
            typeState.protectedKeys = Object.assign({}, encounteredKeys);
            // Check if we can skip analysing this prop early
            if (
            // If it isn't active and hasn't *just* been set as inactive
            (!typeState.isActive && activeDelta === null) ||
                // If we didn't and don't have any defined prop for this animation type
                (!prop && !typeState.prevProp) ||
                // Or if the prop doesn't define an animation
                isAnimationControls(prop) ||
                typeof prop === "boolean") {
                continue;
            }
            /**
             * As we go look through the values defined on this type, if we detect
             * a changed value or a value that was removed in a higher priority, we set
             * this to true and add this prop to the animation list.
             */
            const variantDidChange = checkVariantsDidChange(typeState.prevProp, prop);
            let shouldAnimateType = variantDidChange ||
                // If we're making this variant active, we want to always make it active
                (type === changedActiveType &&
                    typeState.isActive &&
                    !isInherited &&
                    propIsVariant) ||
                // If we removed a higher-priority variant (i is in reverse order)
                (i > removedVariantIndex && propIsVariant);
            /**
             * As animations can be set as variant lists, variants or target objects, we
             * coerce everything to an array if it isn't one already
             */
            const definitionList = Array.isArray(prop) ? prop : [prop];
            /**
             * Build an object of all the resolved values. We'll use this in the subsequent
             * animateChanges calls to determine whether a value has changed.
             */
            let resolvedValues = definitionList.reduce(buildResolvedTypeValues, {});
            if (activeDelta === false)
                resolvedValues = {};
            /**
             * Now we need to loop through all the keys in the prev prop and this prop,
             * and decide:
             * 1. If the value has changed, and needs animating
             * 2. If it has been removed, and needs adding to the removedKeys set
             * 3. If it has been removed in a higher priority type and needs animating
             * 4. If it hasn't been removed in a higher priority but hasn't changed, and
             *    needs adding to the type's protectedKeys list.
             */
            const { prevResolvedValues = {} } = typeState;
            const allKeys = Object.assign(Object.assign({}, prevResolvedValues), resolvedValues);
            const markToAnimate = (key) => {
                shouldAnimateType = true;
                removedKeys.delete(key);
                typeState.needsAnimating[key] = true;
            };
            for (const key in allKeys) {
                const next = resolvedValues[key];
                const prev = prevResolvedValues[key];
                // If we've already handled this we can just skip ahead
                if (encounteredKeys.hasOwnProperty(key))
                    continue;
                /**
                 * If the value has changed, we probably want to animate it.
                 */
                if (next !== prev) {
                    /**
                     * If both values are keyframes, we need to shallow compare them to
                     * detect whether any value has changed. If it has, we animate it.
                     */
                    if (isKeyframesTarget(next) && isKeyframesTarget(prev)) {
                        if (!shallowCompare(next, prev) || variantDidChange) {
                            markToAnimate(key);
                        }
                        else {
                            /**
                             * If it hasn't changed, we want to ensure it doesn't animate by
                             * adding it to the list of protected keys.
                             */
                            typeState.protectedKeys[key] = true;
                        }
                    }
                    else if (next !== undefined) {
                        // If next is defined and doesn't equal prev, it needs animating
                        markToAnimate(key);
                    }
                    else {
                        // If it's undefined, it's been removed.
                        removedKeys.add(key);
                    }
                }
                else if (next !== undefined && removedKeys.has(key)) {
                    /**
                     * If next hasn't changed and it isn't undefined, we want to check if it's
                     * been removed by a higher priority
                     */
                    markToAnimate(key);
                }
                else {
                    /**
                     * If it hasn't changed, we add it to the list of protected values
                     * to ensure it doesn't get animated.
                     */
                    typeState.protectedKeys[key] = true;
                }
            }
            /**
             * Update the typeState so next time animateChanges is called we can compare the
             * latest prop and resolvedValues to these.
             */
            typeState.prevProp = prop;
            typeState.prevResolvedValues = resolvedValues;
            /**
             *
             */
            if (typeState.isActive) {
                encounteredKeys = Object.assign(Object.assign({}, encounteredKeys), resolvedValues);
            }
            if (isInitialRender && visualElement.blockInitialAnimation) {
                shouldAnimateType = false;
            }
            /**
             * If this is an inherited prop we want to hard-block animations
             * TODO: Test as this should probably still handle animations triggered
             * by removed values?
             */
            if (shouldAnimateType && !isInherited) {
                animations.push(...definitionList.map((animation) => ({
                    animation: animation,
                    options: Object.assign({ type }, options),
                })));
            }
        }
        /**
         * If there are some removed value that haven't been dealt with,
         * we need to create a new animation that falls back either to the value
         * defined in the style prop, or the last read value.
         */
        if (removedKeys.size) {
            const fallbackAnimation = {};
            removedKeys.forEach((key) => {
                const fallbackTarget = visualElement.getBaseTarget(key);
                if (fallbackTarget !== undefined) {
                    fallbackAnimation[key] = fallbackTarget;
                }
            });
            animations.push({ animation: fallbackAnimation });
        }
        let shouldAnimate = Boolean(animations.length);
        if (isInitialRender &&
            props.initial === false &&
            !visualElement.manuallyAnimateOnMount) {
            shouldAnimate = false;
        }
        isInitialRender = false;
        return shouldAnimate ? animate(animations) : Promise.resolve();
    }
    /**
     * Change whether a certain animation type is active.
     */
    function setActive(type, isActive, options) {
        var _a;
        // If the active state hasn't changed, we can safely do nothing here
        if (state[type].isActive === isActive)
            return Promise.resolve();
        // Propagate active change to children
        (_a = visualElement.variantChildren) === null || _a === void 0 ? void 0 : _a.forEach((child) => { var _a; return (_a = child.animationState) === null || _a === void 0 ? void 0 : _a.setActive(type, isActive); });
        state[type].isActive = isActive;
        const animations = animateChanges(options, type);
        for (const key in state) {
            state[key].protectedKeys = {};
        }
        return animations;
    }
    return {
        animateChanges,
        setActive,
        setAnimateFunction,
        getState: () => state,
    };
}
function checkVariantsDidChange(prev, next) {
    if (typeof next === "string") {
        return next !== prev;
    }
    else if (isVariantLabels(next)) {
        return !shallowCompare(next, prev);
    }
    return false;
}
function createTypeState(isActive = false) {
    return {
        isActive,
        protectedKeys: {},
        needsAnimating: {},
        prevResolvedValues: {},
    };
}
function createState() {
    return {
        [exports.AnimationType.Animate]: createTypeState(true),
        [exports.AnimationType.InView]: createTypeState(),
        [exports.AnimationType.Hover]: createTypeState(),
        [exports.AnimationType.Tap]: createTypeState(),
        [exports.AnimationType.Drag]: createTypeState(),
        [exports.AnimationType.Focus]: createTypeState(),
        [exports.AnimationType.Exit]: createTypeState(),
    };
}

const animations = {
    animation: makeRenderlessComponent(({ visualElement, animate }) => {
        /**
         * We dynamically generate the AnimationState manager as it contains a reference
         * to the underlying animation library. We only want to load that if we load this,
         * so people can optionally code split it out using the `m` component.
         */
        visualElement.animationState || (visualElement.animationState = createAnimationState(visualElement));
        /**
         * Subscribe any provided AnimationControls to the component's VisualElement
         */
        if (isAnimationControls(animate)) {
            React.useEffect(() => animate.subscribe(visualElement), [animate]);
        }
    }),
    exit: makeRenderlessComponent((props) => {
        const { custom, visualElement } = props;
        const [isPresent, safeToRemove] = usePresence();
        const presenceContext = React.useContext(PresenceContext);
        React.useEffect(() => {
            var _a, _b;
            visualElement.isPresent = isPresent;
            const animation = (_a = visualElement.animationState) === null || _a === void 0 ? void 0 : _a.setActive(exports.AnimationType.Exit, !isPresent, { custom: (_b = presenceContext === null || presenceContext === void 0 ? void 0 : presenceContext.custom) !== null && _b !== void 0 ? _b : custom });
            !isPresent && (animation === null || animation === void 0 ? void 0 : animation.then(safeToRemove));
        }, [isPresent]);
    }),
};

/**
 * @internal
 */
class PanSession {
    constructor(event, handlers, { transformPagePoint } = {}) {
        /**
         * @internal
         */
        this.startEvent = null;
        /**
         * @internal
         */
        this.lastMoveEvent = null;
        /**
         * @internal
         */
        this.lastMoveEventInfo = null;
        /**
         * @internal
         */
        this.handlers = {};
        this.updatePoint = () => {
            if (!(this.lastMoveEvent && this.lastMoveEventInfo))
                return;
            const info = getPanInfo(this.lastMoveEventInfo, this.history);
            const isPanStarted = this.startEvent !== null;
            // Only start panning if the offset is larger than 3 pixels. If we make it
            // any larger than this we'll want to reset the pointer history
            // on the first update to avoid visual snapping to the cursoe.
            const isDistancePastThreshold = popmotion.distance(info.offset, { x: 0, y: 0 }) >= 3;
            if (!isPanStarted && !isDistancePastThreshold)
                return;
            const { point } = info;
            const { timestamp } = sync.getFrameData();
            this.history.push(Object.assign(Object.assign({}, point), { timestamp }));
            const { onStart, onMove } = this.handlers;
            if (!isPanStarted) {
                onStart && onStart(this.lastMoveEvent, info);
                this.startEvent = this.lastMoveEvent;
            }
            onMove && onMove(this.lastMoveEvent, info);
        };
        this.handlePointerMove = (event, info) => {
            this.lastMoveEvent = event;
            this.lastMoveEventInfo = transformPoint(info, this.transformPagePoint);
            // Because Safari doesn't trigger mouseup events when it's above a `<select>`
            if (isMouseEvent(event) && event.buttons === 0) {
                this.handlePointerUp(event, info);
                return;
            }
            // Throttle mouse move event to once per frame
            sync__default["default"].update(this.updatePoint, true);
        };
        this.handlePointerUp = (event, info) => {
            this.end();
            const { onEnd, onSessionEnd } = this.handlers;
            const panInfo = getPanInfo(transformPoint(info, this.transformPagePoint), this.history);
            if (this.startEvent && onEnd) {
                onEnd(event, panInfo);
            }
            onSessionEnd && onSessionEnd(event, panInfo);
        };
        // If we have more than one touch, don't start detecting this gesture
        if (isTouchEvent(event) && event.touches.length > 1)
            return;
        this.handlers = handlers;
        this.transformPagePoint = transformPagePoint;
        const info = extractEventInfo(event);
        const initialInfo = transformPoint(info, this.transformPagePoint);
        const { point } = initialInfo;
        const { timestamp } = sync.getFrameData();
        this.history = [Object.assign(Object.assign({}, point), { timestamp })];
        const { onSessionStart } = handlers;
        onSessionStart &&
            onSessionStart(event, getPanInfo(initialInfo, this.history));
        this.removeListeners = popmotion.pipe(addPointerEvent(window, "pointermove", this.handlePointerMove), addPointerEvent(window, "pointerup", this.handlePointerUp), addPointerEvent(window, "pointercancel", this.handlePointerUp));
    }
    updateHandlers(handlers) {
        this.handlers = handlers;
    }
    end() {
        this.removeListeners && this.removeListeners();
        sync.cancelSync.update(this.updatePoint);
    }
}
function transformPoint(info, transformPagePoint) {
    return transformPagePoint ? { point: transformPagePoint(info.point) } : info;
}
function subtractPoint(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}
function getPanInfo({ point }, history) {
    return {
        point,
        delta: subtractPoint(point, lastDevicePoint(history)),
        offset: subtractPoint(point, startDevicePoint(history)),
        velocity: getVelocity(history, 0.1),
    };
}
function startDevicePoint(history) {
    return history[0];
}
function lastDevicePoint(history) {
    return history[history.length - 1];
}
function getVelocity(history, timeDelta) {
    if (history.length < 2) {
        return { x: 0, y: 0 };
    }
    let i = history.length - 1;
    let timestampedPoint = null;
    const lastPoint = lastDevicePoint(history);
    while (i >= 0) {
        timestampedPoint = history[i];
        if (lastPoint.timestamp - timestampedPoint.timestamp >
            secondsToMilliseconds(timeDelta)) {
            break;
        }
        i--;
    }
    if (!timestampedPoint) {
        return { x: 0, y: 0 };
    }
    const time = (lastPoint.timestamp - timestampedPoint.timestamp) / 1000;
    if (time === 0) {
        return { x: 0, y: 0 };
    }
    const currentVelocity = {
        x: (lastPoint.x - timestampedPoint.x) / time,
        y: (lastPoint.y - timestampedPoint.y) / time,
    };
    if (currentVelocity.x === Infinity) {
        currentVelocity.x = 0;
    }
    if (currentVelocity.y === Infinity) {
        currentVelocity.y = 0;
    }
    return currentVelocity;
}

function calcLength(axis) {
    return axis.max - axis.min;
}
function isNear(value, target = 0, maxDistance = 0.01) {
    return popmotion.distance(value, target) < maxDistance;
}
function calcAxisDelta(delta, source, target, origin = 0.5) {
    delta.origin = origin;
    delta.originPoint = popmotion.mix(source.min, source.max, delta.origin);
    delta.scale = calcLength(target) / calcLength(source);
    if (isNear(delta.scale, 1, 0.0001) || isNaN(delta.scale))
        delta.scale = 1;
    delta.translate =
        popmotion.mix(target.min, target.max, delta.origin) - delta.originPoint;
    if (isNear(delta.translate) || isNaN(delta.translate))
        delta.translate = 0;
}
function calcBoxDelta(delta, source, target, origin) {
    calcAxisDelta(delta.x, source.x, target.x, origin === null || origin === void 0 ? void 0 : origin.originX);
    calcAxisDelta(delta.y, source.y, target.y, origin === null || origin === void 0 ? void 0 : origin.originY);
}
function calcRelativeAxis(target, relative, parent) {
    target.min = parent.min + relative.min;
    target.max = target.min + calcLength(relative);
}
function calcRelativeBox(target, relative, parent) {
    calcRelativeAxis(target.x, relative.x, parent.x);
    calcRelativeAxis(target.y, relative.y, parent.y);
}
function calcRelativeAxisPosition(target, layout, parent) {
    target.min = layout.min - parent.min;
    target.max = target.min + calcLength(layout);
}
function calcRelativePosition(target, layout, parent) {
    calcRelativeAxisPosition(target.x, layout.x, parent.x);
    calcRelativeAxisPosition(target.y, layout.y, parent.y);
}

/**
 * Apply constraints to a point. These constraints are both physical along an
 * axis, and an elastic factor that determines how much to constrain the point
 * by if it does lie outside the defined parameters.
 */
function applyConstraints(point, { min, max }, elastic) {
    if (min !== undefined && point < min) {
        // If we have a min point defined, and this is outside of that, constrain
        point = elastic ? popmotion.mix(min, point, elastic.min) : Math.max(point, min);
    }
    else if (max !== undefined && point > max) {
        // If we have a max point defined, and this is outside of that, constrain
        point = elastic ? popmotion.mix(max, point, elastic.max) : Math.min(point, max);
    }
    return point;
}
/**
 * Calculate constraints in terms of the viewport when defined relatively to the
 * measured axis. This is measured from the nearest edge, so a max constraint of 200
 * on an axis with a max value of 300 would return a constraint of 500 - axis length
 */
function calcRelativeAxisConstraints(axis, min, max) {
    return {
        min: min !== undefined ? axis.min + min : undefined,
        max: max !== undefined
            ? axis.max + max - (axis.max - axis.min)
            : undefined,
    };
}
/**
 * Calculate constraints in terms of the viewport when
 * defined relatively to the measured bounding box.
 */
function calcRelativeConstraints(layoutBox, { top, left, bottom, right }) {
    return {
        x: calcRelativeAxisConstraints(layoutBox.x, left, right),
        y: calcRelativeAxisConstraints(layoutBox.y, top, bottom),
    };
}
/**
 * Calculate viewport constraints when defined as another viewport-relative axis
 */
function calcViewportAxisConstraints(layoutAxis, constraintsAxis) {
    let min = constraintsAxis.min - layoutAxis.min;
    let max = constraintsAxis.max - layoutAxis.max;
    // If the constraints axis is actually smaller than the layout axis then we can
    // flip the constraints
    if (constraintsAxis.max - constraintsAxis.min <
        layoutAxis.max - layoutAxis.min) {
        [min, max] = [max, min];
    }
    return { min, max };
}
/**
 * Calculate viewport constraints when defined as another viewport-relative box
 */
function calcViewportConstraints(layoutBox, constraintsBox) {
    return {
        x: calcViewportAxisConstraints(layoutBox.x, constraintsBox.x),
        y: calcViewportAxisConstraints(layoutBox.y, constraintsBox.y),
    };
}
/**
 * Calculate a transform origin relative to the source axis, between 0-1, that results
 * in an asthetically pleasing scale/transform needed to project from source to target.
 */
function calcOrigin(source, target) {
    let origin = 0.5;
    const sourceLength = calcLength(source);
    const targetLength = calcLength(target);
    if (targetLength > sourceLength) {
        origin = popmotion.progress(target.min, target.max - sourceLength, source.min);
    }
    else if (sourceLength > targetLength) {
        origin = popmotion.progress(source.min, source.max - targetLength, target.min);
    }
    return popmotion.clamp(0, 1, origin);
}
/**
 * Rebase the calculated viewport constraints relative to the layout.min point.
 */
function rebaseAxisConstraints(layout, constraints) {
    const relativeConstraints = {};
    if (constraints.min !== undefined) {
        relativeConstraints.min = constraints.min - layout.min;
    }
    if (constraints.max !== undefined) {
        relativeConstraints.max = constraints.max - layout.min;
    }
    return relativeConstraints;
}
const defaultElastic = 0.35;
/**
 * Accepts a dragElastic prop and returns resolved elastic values for each axis.
 */
function resolveDragElastic(dragElastic = defaultElastic) {
    if (dragElastic === false) {
        dragElastic = 0;
    }
    else if (dragElastic === true) {
        dragElastic = defaultElastic;
    }
    return {
        x: resolveAxisElastic(dragElastic, "left", "right"),
        y: resolveAxisElastic(dragElastic, "top", "bottom"),
    };
}
function resolveAxisElastic(dragElastic, minLabel, maxLabel) {
    return {
        min: resolvePointElastic(dragElastic, minLabel),
        max: resolvePointElastic(dragElastic, maxLabel),
    };
}
function resolvePointElastic(dragElastic, label) {
    var _a;
    return typeof dragElastic === "number"
        ? dragElastic
        : (_a = dragElastic[label]) !== null && _a !== void 0 ? _a : 0;
}

const createAxisDelta = () => ({
    translate: 0,
    scale: 1,
    origin: 0,
    originPoint: 0,
});
const createDelta = () => ({
    x: createAxisDelta(),
    y: createAxisDelta(),
});
const createAxis = () => ({ min: 0, max: 0 });
const createBox = () => ({
    x: createAxis(),
    y: createAxis(),
});

function eachAxis(callback) {
    return [callback("x"), callback("y")];
}

/**
 * Bounding boxes tend to be defined as top, left, right, bottom. For various operations
 * it's easier to consider each axis individually. This function returns a bounding box
 * as a map of single-axis min/max values.
 */
function convertBoundingBoxToBox({ top, left, right, bottom, }) {
    return {
        x: { min: left, max: right },
        y: { min: top, max: bottom },
    };
}
function convertBoxToBoundingBox({ x, y }) {
    return { top: y.min, right: x.max, bottom: y.max, left: x.min };
}
/**
 * Applies a TransformPoint function to a bounding box. TransformPoint is usually a function
 * provided by Framer to allow measured points to be corrected for device scaling. This is used
 * when measuring DOM elements and DOM event points.
 */
function transformBoxPoints(point, transformPoint) {
    if (!transformPoint)
        return point;
    const topLeft = transformPoint({ x: point.left, y: point.top });
    const bottomRight = transformPoint({ x: point.right, y: point.bottom });
    return {
        top: topLeft.y,
        left: topLeft.x,
        bottom: bottomRight.y,
        right: bottomRight.x,
    };
}

function isIdentityScale(scale) {
    return scale === undefined || scale === 1;
}
function hasScale({ scale, scaleX, scaleY }) {
    return (!isIdentityScale(scale) ||
        !isIdentityScale(scaleX) ||
        !isIdentityScale(scaleY));
}
function hasTransform(values) {
    return (hasScale(values) ||
        hasTranslate(values.x) ||
        hasTranslate(values.y) ||
        values.z ||
        values.rotate ||
        values.rotateX ||
        values.rotateY);
}
function hasTranslate(value) {
    return value && value !== "0%";
}

/**
 * Scales a point based on a factor and an originPoint
 */
function scalePoint(point, scale, originPoint) {
    const distanceFromOrigin = point - originPoint;
    const scaled = scale * distanceFromOrigin;
    return originPoint + scaled;
}
/**
 * Applies a translate/scale delta to a point
 */
function applyPointDelta(point, translate, scale, originPoint, boxScale) {
    if (boxScale !== undefined) {
        point = scalePoint(point, boxScale, originPoint);
    }
    return scalePoint(point, scale, originPoint) + translate;
}
/**
 * Applies a translate/scale delta to an axis
 */
function applyAxisDelta(axis, translate = 0, scale = 1, originPoint, boxScale) {
    axis.min = applyPointDelta(axis.min, translate, scale, originPoint, boxScale);
    axis.max = applyPointDelta(axis.max, translate, scale, originPoint, boxScale);
}
/**
 * Applies a translate/scale delta to a box
 */
function applyBoxDelta(box, { x, y }) {
    applyAxisDelta(box.x, x.translate, x.scale, x.originPoint);
    applyAxisDelta(box.y, y.translate, y.scale, y.originPoint);
}
/**
 * Apply a tree of deltas to a box. We do this to calculate the effect of all the transforms
 * in a tree upon our box before then calculating how to project it into our desired viewport-relative box
 *
 * This is the final nested loop within updateLayoutDelta for future refactoring
 */
function applyTreeDeltas(box, treeScale, treePath, isSharedTransition = false) {
    var _a, _b;
    const treeLength = treePath.length;
    if (!treeLength)
        return;
    // Reset the treeScale
    treeScale.x = treeScale.y = 1;
    let node;
    let delta;
    for (let i = 0; i < treeLength; i++) {
        node = treePath[i];
        delta = node.projectionDelta;
        if (((_b = (_a = node.instance) === null || _a === void 0 ? void 0 : _a.style) === null || _b === void 0 ? void 0 : _b.display) === "contents")
            continue;
        if (isSharedTransition &&
            node.options.layoutScroll &&
            node.scroll &&
            node !== node.root) {
            transformBox(box, { x: -node.scroll.x, y: -node.scroll.y });
        }
        if (delta) {
            // Incoporate each ancestor's scale into a culmulative treeScale for this component
            treeScale.x *= delta.x.scale;
            treeScale.y *= delta.y.scale;
            // Apply each ancestor's calculated delta into this component's recorded layout box
            applyBoxDelta(box, delta);
        }
        if (isSharedTransition && hasTransform(node.latestValues)) {
            transformBox(box, node.latestValues);
        }
    }
}
function translateAxis(axis, distance) {
    axis.min = axis.min + distance;
    axis.max = axis.max + distance;
}
/**
 * Apply a transform to an axis from the latest resolved motion values.
 * This function basically acts as a bridge between a flat motion value map
 * and applyAxisDelta
 */
function transformAxis(axis, transforms, [key, scaleKey, originKey]) {
    const axisOrigin = transforms[originKey] !== undefined ? transforms[originKey] : 0.5;
    const originPoint = popmotion.mix(axis.min, axis.max, axisOrigin);
    // Apply the axis delta to the final axis
    applyAxisDelta(axis, transforms[key], transforms[scaleKey], originPoint, transforms.scale);
}
/**
 * The names of the motion values we want to apply as translation, scale and origin.
 */
const xKeys$1 = ["x", "scaleX", "originX"];
const yKeys$1 = ["y", "scaleY", "originY"];
/**
 * Apply a transform to a box from the latest resolved motion values.
 */
function transformBox(box, transform) {
    transformAxis(box.x, transform, xKeys$1);
    transformAxis(box.y, transform, yKeys$1);
}

function measureViewportBox(instance, transformPoint) {
    return convertBoundingBoxToBox(transformBoxPoints(instance.getBoundingClientRect(), transformPoint));
}
function measurePageBox(element, rootProjectionNode, transformPagePoint) {
    const viewportBox = measureViewportBox(element, transformPagePoint);
    const { scroll } = rootProjectionNode;
    if (scroll) {
        translateAxis(viewportBox.x, scroll.x);
        translateAxis(viewportBox.y, scroll.y);
    }
    return viewportBox;
}

const elementDragControls = new WeakMap();
/**
 *
 */
// let latestPointerEvent: AnyPointerEvent
class VisualElementDragControls {
    constructor(visualElement) {
        // This is a reference to the global drag gesture lock, ensuring only one component
        // can "capture" the drag of one or both axes.
        // TODO: Look into moving this into pansession?
        this.openGlobalLock = null;
        this.isDragging = false;
        this.currentDirection = null;
        this.originPoint = { x: 0, y: 0 };
        /**
         * The permitted boundaries of travel, in pixels.
         */
        this.constraints = false;
        this.hasMutatedConstraints = false;
        /**
         * The per-axis resolved elastic values.
         */
        this.elastic = createBox();
        this.visualElement = visualElement;
    }
    start(originEvent, { snapToCursor = false } = {}) {
        /**
         * Don't start dragging if this component is exiting
         */
        if (this.visualElement.isPresent === false)
            return;
        const onSessionStart = (event) => {
            // Stop any animations on both axis values immediately. This allows the user to throw and catch
            // the component.
            this.stopAnimation();
            if (snapToCursor) {
                this.snapToCursor(extractEventInfo(event, "page").point);
            }
        };
        const onStart = (event, info) => {
            var _a;
            // Attempt to grab the global drag gesture lock - maybe make this part of PanSession
            const { drag, dragPropagation, onDragStart } = this.getProps();
            if (drag && !dragPropagation) {
                if (this.openGlobalLock)
                    this.openGlobalLock();
                this.openGlobalLock = getGlobalLock(drag);
                // If we don 't have the lock, don't start dragging
                if (!this.openGlobalLock)
                    return;
            }
            this.isDragging = true;
            this.currentDirection = null;
            this.resolveConstraints();
            if (this.visualElement.projection) {
                this.visualElement.projection.isAnimationBlocked = true;
                this.visualElement.projection.target = undefined;
            }
            /**
             * Record gesture origin
             */
            eachAxis((axis) => {
                var _a, _b;
                let current = this.getAxisMotionValue(axis).get() || 0;
                /**
                 * If the MotionValue is a percentage value convert to px
                 */
                if (styleValueTypes.percent.test(current)) {
                    const measuredAxis = (_b = (_a = this.visualElement.projection) === null || _a === void 0 ? void 0 : _a.layout) === null || _b === void 0 ? void 0 : _b.actual[axis];
                    if (measuredAxis) {
                        const length = calcLength(measuredAxis);
                        current = length * (parseFloat(current) / 100);
                    }
                }
                this.originPoint[axis] = current;
            });
            // Fire onDragStart event
            onDragStart === null || onDragStart === void 0 ? void 0 : onDragStart(event, info);
            (_a = this.visualElement.animationState) === null || _a === void 0 ? void 0 : _a.setActive(exports.AnimationType.Drag, true);
        };
        const onMove = (event, info) => {
            // latestPointerEvent = event
            const { dragPropagation, dragDirectionLock, onDirectionLock, onDrag, } = this.getProps();
            // If we didn't successfully receive the gesture lock, early return.
            if (!dragPropagation && !this.openGlobalLock)
                return;
            const { offset } = info;
            // Attempt to detect drag direction if directionLock is true
            if (dragDirectionLock && this.currentDirection === null) {
                this.currentDirection = getCurrentDirection(offset);
                // If we've successfully set a direction, notify listener
                if (this.currentDirection !== null) {
                    onDirectionLock === null || onDirectionLock === void 0 ? void 0 : onDirectionLock(this.currentDirection);
                }
                return;
            }
            // Update each point with the latest position
            this.updateAxis("x", info.point, offset);
            this.updateAxis("y", info.point, offset);
            /**
             * Ideally we would leave the renderer to fire naturally at the end of
             * this frame but if the element is about to change layout as the result
             * of a re-render we want to ensure the browser can read the latest
             * bounding box to ensure the pointer and element don't fall out of sync.
             */
            this.visualElement.syncRender();
            /**
             * This must fire after the syncRender call as it might trigger a state
             * change which itself might trigger a layout update.
             */
            onDrag === null || onDrag === void 0 ? void 0 : onDrag(event, info);
        };
        const onSessionEnd = (event, info) => this.stop(event, info);
        this.panSession = new PanSession(originEvent, {
            onSessionStart,
            onStart,
            onMove,
            onSessionEnd,
        }, { transformPagePoint: this.visualElement.getTransformPagePoint() });
    }
    stop(event, info) {
        const isDragging = this.isDragging;
        this.cancel();
        if (!isDragging)
            return;
        const { velocity } = info;
        this.startAnimation(velocity);
        const { onDragEnd } = this.getProps();
        onDragEnd === null || onDragEnd === void 0 ? void 0 : onDragEnd(event, info);
    }
    cancel() {
        var _a, _b;
        this.isDragging = false;
        if (this.visualElement.projection) {
            this.visualElement.projection.isAnimationBlocked = false;
        }
        (_a = this.panSession) === null || _a === void 0 ? void 0 : _a.end();
        this.panSession = undefined;
        const { dragPropagation } = this.getProps();
        if (!dragPropagation && this.openGlobalLock) {
            this.openGlobalLock();
            this.openGlobalLock = null;
        }
        (_b = this.visualElement.animationState) === null || _b === void 0 ? void 0 : _b.setActive(exports.AnimationType.Drag, false);
    }
    updateAxis(axis, _point, offset) {
        const { drag } = this.getProps();
        // If we're not dragging this axis, do an early return.
        if (!offset || !shouldDrag(axis, drag, this.currentDirection))
            return;
        const axisValue = this.getAxisMotionValue(axis);
        let next = this.originPoint[axis] + offset[axis];
        // Apply constraints
        if (this.constraints && this.constraints[axis]) {
            next = applyConstraints(next, this.constraints[axis], this.elastic[axis]);
        }
        axisValue.set(next);
    }
    resolveConstraints() {
        const { dragConstraints, dragElastic } = this.getProps();
        const { layout } = this.visualElement.projection || {};
        const prevConstraints = this.constraints;
        if (dragConstraints && isRefObject(dragConstraints)) {
            if (!this.constraints) {
                this.constraints = this.resolveRefConstraints();
            }
        }
        else {
            if (dragConstraints && layout) {
                this.constraints = calcRelativeConstraints(layout.actual, dragConstraints);
            }
            else {
                this.constraints = false;
            }
        }
        this.elastic = resolveDragElastic(dragElastic);
        /**
         * If we're outputting to external MotionValues, we want to rebase the measured constraints
         * from viewport-relative to component-relative.
         */
        if (prevConstraints !== this.constraints &&
            layout &&
            this.constraints &&
            !this.hasMutatedConstraints) {
            eachAxis((axis) => {
                if (this.getAxisMotionValue(axis)) {
                    this.constraints[axis] = rebaseAxisConstraints(layout.actual[axis], this.constraints[axis]);
                }
            });
        }
    }
    resolveRefConstraints() {
        const { dragConstraints: constraints, onMeasureDragConstraints } = this.getProps();
        if (!constraints || !isRefObject(constraints))
            return false;
        const constraintsElement = constraints.current;
        heyListen.invariant(constraintsElement !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.");
        const { projection } = this.visualElement;
        // TODO
        if (!projection || !projection.layout)
            return false;
        const constraintsBox = measurePageBox(constraintsElement, projection.root, this.visualElement.getTransformPagePoint());
        let measuredConstraints = calcViewportConstraints(projection.layout.actual, constraintsBox);
        /**
         * If there's an onMeasureDragConstraints listener we call it and
         * if different constraints are returned, set constraints to that
         */
        if (onMeasureDragConstraints) {
            const userConstraints = onMeasureDragConstraints(convertBoxToBoundingBox(measuredConstraints));
            this.hasMutatedConstraints = !!userConstraints;
            if (userConstraints) {
                measuredConstraints = convertBoundingBoxToBox(userConstraints);
            }
        }
        return measuredConstraints;
    }
    startAnimation(velocity) {
        const { drag, dragMomentum, dragElastic, dragTransition, dragSnapToOrigin, onDragTransitionEnd, } = this.getProps();
        const constraints = this.constraints || {};
        const momentumAnimations = eachAxis((axis) => {
            var _a;
            if (!shouldDrag(axis, drag, this.currentDirection)) {
                return;
            }
            let transition = (_a = constraints === null || constraints === void 0 ? void 0 : constraints[axis]) !== null && _a !== void 0 ? _a : {};
            if (dragSnapToOrigin)
                transition = { min: 0, max: 0 };
            /**
             * Overdamp the boundary spring if `dragElastic` is disabled. There's still a frame
             * of spring animations so we should look into adding a disable spring option to `inertia`.
             * We could do something here where we affect the `bounceStiffness` and `bounceDamping`
             * using the value of `dragElastic`.
             */
            const bounceStiffness = dragElastic ? 200 : 1000000;
            const bounceDamping = dragElastic ? 40 : 10000000;
            const inertia = Object.assign(Object.assign({ type: "inertia", velocity: dragMomentum ? velocity[axis] : 0, bounceStiffness,
                bounceDamping, timeConstant: 750, restDelta: 1, restSpeed: 10 }, dragTransition), transition);
            // If we're not animating on an externally-provided `MotionValue` we can use the
            // component's animation controls which will handle interactions with whileHover (etc),
            // otherwise we just have to animate the `MotionValue` itself.
            return this.startAxisValueAnimation(axis, inertia);
        });
        // Run all animations and then resolve the new drag constraints.
        return Promise.all(momentumAnimations).then(onDragTransitionEnd);
    }
    startAxisValueAnimation(axis, transition) {
        const axisValue = this.getAxisMotionValue(axis);
        return startAnimation(axis, axisValue, 0, transition);
    }
    stopAnimation() {
        eachAxis((axis) => this.getAxisMotionValue(axis).stop());
    }
    /**
     * Drag works differently depending on which props are provided.
     *
     * - If _dragX and _dragY are provided, we output the gesture delta directly to those motion values.
     * - Otherwise, we apply the delta to the x/y motion values.
     */
    getAxisMotionValue(axis) {
        var _a, _b;
        const dragKey = "_drag" + axis.toUpperCase();
        const externalMotionValue = this.visualElement.getProps()[dragKey];
        return externalMotionValue
            ? externalMotionValue
            : this.visualElement.getValue(axis, (_b = (_a = this.visualElement.getProps().initial) === null || _a === void 0 ? void 0 : _a[axis]) !== null && _b !== void 0 ? _b : 0);
    }
    snapToCursor(point) {
        eachAxis((axis) => {
            const { drag } = this.getProps();
            // If we're not dragging this axis, do an early return.
            if (!shouldDrag(axis, drag, this.currentDirection))
                return;
            const { projection } = this.visualElement;
            const axisValue = this.getAxisMotionValue(axis);
            if (projection && projection.layout) {
                const { min, max } = projection.layout.actual[axis];
                axisValue.set(point[axis] - popmotion.mix(min, max, 0.5));
            }
        });
    }
    /**
     * When the viewport resizes we want to check if the measured constraints
     * have changed and, if so, reposition the element within those new constraints
     * relative to where it was before the resize.
     */
    scalePositionWithinConstraints() {
        var _a;
        const { drag, dragConstraints } = this.getProps();
        const { projection } = this.visualElement;
        if (!isRefObject(dragConstraints) || !projection || !this.constraints)
            return;
        /**
         * Stop current animations as there can be visual glitching if we try to do
         * this mid-animation
         */
        this.stopAnimation();
        /**
         * Record the relative position of the dragged element relative to the
         * constraints box and save as a progress value.
         */
        const boxProgress = { x: 0, y: 0 };
        eachAxis((axis) => {
            const axisValue = this.getAxisMotionValue(axis);
            if (axisValue) {
                const latest = axisValue.get();
                boxProgress[axis] = calcOrigin({ min: latest, max: latest }, this.constraints[axis]);
            }
        });
        /**
         * Update the layout of this element and resolve the latest drag constraints
         */
        const { transformTemplate } = this.visualElement.getProps();
        this.visualElement.getInstance().style.transform = transformTemplate
            ? transformTemplate({}, "")
            : "none";
        (_a = projection.root) === null || _a === void 0 ? void 0 : _a.updateScroll();
        projection.updateLayout();
        this.resolveConstraints();
        /**
         * For each axis, calculate the current progress of the layout axis
         * within the new constraints.
         */
        eachAxis((axis) => {
            if (!shouldDrag(axis, drag, null))
                return;
            /**
             * Calculate a new transform based on the previous box progress
             */
            const axisValue = this.getAxisMotionValue(axis);
            const { min, max } = this.constraints[axis];
            axisValue.set(popmotion.mix(min, max, boxProgress[axis]));
        });
    }
    addListeners() {
        var _a;
        elementDragControls.set(this.visualElement, this);
        const element = this.visualElement.getInstance();
        /**
         * Attach a pointerdown event listener on this DOM element to initiate drag tracking.
         */
        const stopPointerListener = addPointerEvent(element, "pointerdown", (event) => {
            const { drag, dragListener = true } = this.getProps();
            drag && dragListener && this.start(event);
        });
        const measureDragConstraints = () => {
            const { dragConstraints } = this.getProps();
            if (isRefObject(dragConstraints)) {
                this.constraints = this.resolveRefConstraints();
            }
        };
        const { projection } = this.visualElement;
        const stopMeasureLayoutListener = projection.addEventListener("measure", measureDragConstraints);
        if (projection && !projection.layout) {
            (_a = projection.root) === null || _a === void 0 ? void 0 : _a.updateScroll();
            projection.updateLayout();
        }
        measureDragConstraints();
        /**
         * Attach a window resize listener to scale the draggable target within its defined
         * constraints as the window resizes.
         */
        const stopResizeListener = addDomEvent(window, "resize", () => this.scalePositionWithinConstraints());
        /**
         * If the element's layout changes, calculate the delta and apply that to
         * the drag gesture's origin point.
         */
        const stopLayoutUpdateListener = projection.addEventListener("didUpdate", (({ delta, hasLayoutChanged }) => {
            if (this.isDragging && hasLayoutChanged) {
                eachAxis((axis) => {
                    const motionValue = this.getAxisMotionValue(axis);
                    if (!motionValue)
                        return;
                    this.originPoint[axis] += delta[axis].translate;
                    motionValue.set(motionValue.get() + delta[axis].translate);
                });
                this.visualElement.syncRender();
            }
        }));
        return () => {
            stopResizeListener();
            stopPointerListener();
            stopMeasureLayoutListener();
            stopLayoutUpdateListener === null || stopLayoutUpdateListener === void 0 ? void 0 : stopLayoutUpdateListener();
        };
    }
    getProps() {
        const props = this.visualElement.getProps();
        const { drag = false, dragDirectionLock = false, dragPropagation = false, dragConstraints = false, dragElastic = defaultElastic, dragMomentum = true, } = props;
        return Object.assign(Object.assign({}, props), { drag,
            dragDirectionLock,
            dragPropagation,
            dragConstraints,
            dragElastic,
            dragMomentum });
    }
}
function shouldDrag(direction, drag, currentDirection) {
    return ((drag === true || drag === direction) &&
        (currentDirection === null || currentDirection === direction));
}
/**
 * Based on an x/y offset determine the current drag direction. If both axis' offsets are lower
 * than the provided threshold, return `null`.
 *
 * @param offset - The x/y offset from origin.
 * @param lockThreshold - (Optional) - the minimum absolute offset before we can determine a drag direction.
 */
function getCurrentDirection(offset, lockThreshold = 10) {
    let direction = null;
    if (Math.abs(offset.y) > lockThreshold) {
        direction = "y";
    }
    else if (Math.abs(offset.x) > lockThreshold) {
        direction = "x";
    }
    return direction;
}

/**
 * A hook that allows an element to be dragged.
 *
 * @internal
 */
function useDrag(props) {
    const { dragControls: groupDragControls, visualElement } = props;
    const dragControls = useConstant(() => new VisualElementDragControls(visualElement));
    // If we've been provided a DragControls for manual control over the drag gesture,
    // subscribe this component to it on mount.
    React.useEffect(() => groupDragControls && groupDragControls.subscribe(dragControls), [dragControls, groupDragControls]);
    // Apply the event listeners to the element
    React.useEffect(() => dragControls.addListeners(), [dragControls]);
}

/**
 *
 * @param handlers -
 * @param ref -
 *
 * @privateRemarks
 * Currently this sets new pan gesture functions every render. The memo route has been explored
 * in the past but ultimately we're still creating new functions every render. An optimisation
 * to explore is creating the pan gestures and loading them into a `ref`.
 *
 * @internal
 */
function usePanGesture({ onPan, onPanStart, onPanEnd, onPanSessionStart, visualElement, }) {
    const hasPanEvents = onPan || onPanStart || onPanEnd || onPanSessionStart;
    const panSession = React.useRef(null);
    const { transformPagePoint } = React.useContext(MotionConfigContext);
    const handlers = {
        onSessionStart: onPanSessionStart,
        onStart: onPanStart,
        onMove: onPan,
        onEnd: (event, info) => {
            panSession.current = null;
            onPanEnd && onPanEnd(event, info);
        },
    };
    React.useEffect(() => {
        if (panSession.current !== null) {
            panSession.current.updateHandlers(handlers);
        }
    });
    function onPointerDown(event) {
        panSession.current = new PanSession(event, handlers, {
            transformPagePoint,
        });
    }
    usePointerEvent(visualElement, "pointerdown", hasPanEvents && onPointerDown);
    useUnmountEffect(() => panSession.current && panSession.current.end());
}

const drag = {
    pan: makeRenderlessComponent(usePanGesture),
    drag: makeRenderlessComponent(useDrag),
};

const names = [
    "LayoutMeasure",
    "BeforeLayoutMeasure",
    "LayoutUpdate",
    "ViewportBoxUpdate",
    "Update",
    "Render",
    "AnimationComplete",
    "LayoutAnimationComplete",
    "AnimationStart",
    "LayoutAnimationStart",
    "SetAxisTarget",
    "Unmount",
];
function createLifecycles() {
    const managers = names.map(() => new SubscriptionManager());
    const propSubscriptions = {};
    const lifecycles = {
        clearAllListeners: () => managers.forEach((manager) => manager.clear()),
        updatePropListeners: (props) => {
            names.forEach((name) => {
                var _a;
                const on = "on" + name;
                const propListener = props[on];
                // Unsubscribe existing subscription
                (_a = propSubscriptions[name]) === null || _a === void 0 ? void 0 : _a.call(propSubscriptions);
                // Add new subscription
                if (propListener) {
                    propSubscriptions[name] = lifecycles[on](propListener);
                }
            });
        },
    };
    managers.forEach((manager, i) => {
        lifecycles["on" + names[i]] = (handler) => manager.add(handler);
        lifecycles["notify" + names[i]] = (...args) => manager.notify(...args);
    });
    return lifecycles;
}

function updateMotionValuesFromProps(element, next, prev) {
    var _a;
    const { willChange } = next;
    for (const key in next) {
        const nextValue = next[key];
        const prevValue = prev[key];
        if (isMotionValue(nextValue)) {
            /**
             * If this is a motion value found in props or style, we want to add it
             * to our visual element's motion value map.
             */
            element.addValue(key, nextValue);
            if (isWillChangeMotionValue(willChange)) {
                willChange.add(key);
            }
            /**
             * Check the version of the incoming motion value with this version
             * and warn against mismatches.
             */
            if (process.env.NODE_ENV === "development") {
                warnOnce(nextValue.version === "7.2.0", `Attempting to mix Framer Motion versions ${nextValue.version} with 7.2.0 may not work as expected.`);
            }
        }
        else if (isMotionValue(prevValue)) {
            /**
             * If we're swapping from a motion value to a static value,
             * create a new motion value from that
             */
            element.addValue(key, motionValue(nextValue));
            if (isWillChangeMotionValue(willChange)) {
                willChange.remove(key);
            }
        }
        else if (prevValue !== nextValue) {
            /**
             * If this is a flat value that has changed, update the motion value
             * or create one if it doesn't exist. We only want to do this if we're
             * not handling the value with our animation state.
             */
            if (element.hasValue(key)) {
                const existingValue = element.getValue(key);
                // TODO: Only update values that aren't being animated or even looked at
                !existingValue.hasAnimated && existingValue.set(nextValue);
            }
            else {
                element.addValue(key, motionValue((_a = element.getStaticValue(key)) !== null && _a !== void 0 ? _a : nextValue));
            }
        }
    }
    // Handle removed values
    for (const key in prev) {
        if (next[key] === undefined)
            element.removeValue(key);
    }
    return next;
}

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
            props.onUpdate && sync__default["default"].update(update, false, true);
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
    const _a = scrapeMotionValuesFromProps(props), { willChange } = _a, initialMotionValues = tslib.__rest(_a, ["willChange"]);
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
            sync.cancelSync.update(update);
            sync.cancelSync.render(render);
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
            sync__default["default"].render(render, false, true);
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

function isCSSVariable(value) {
    return typeof value === "string" && value.startsWith("var(--");
}
/**
 * Parse Framer's special CSS variable format into a CSS token and a fallback.
 *
 * ```
 * `var(--foo, #fff)` => [`--foo`, '#fff']
 * ```
 *
 * @param current
 */
const cssVariableRegex = /var\((--[a-zA-Z0-9-_]+),? ?([a-zA-Z0-9 ()%#.,-]+)?\)/;
function parseCSSVariable(current) {
    const match = cssVariableRegex.exec(current);
    if (!match)
        return [,];
    const [, token, fallback] = match;
    return [token, fallback];
}
const maxDepth = 4;
function getVariableValue(current, element, depth = 1) {
    heyListen.invariant(depth <= maxDepth, `Max CSS variable fallback depth detected in property "${current}". This may indicate a circular fallback dependency.`);
    const [token, fallback] = parseCSSVariable(current);
    // No CSS variable detected
    if (!token)
        return;
    // Attempt to read this CSS variable off the element
    const resolved = window.getComputedStyle(element).getPropertyValue(token);
    if (resolved) {
        return resolved.trim();
    }
    else if (isCSSVariable(fallback)) {
        // The fallback might itself be a CSS variable, in which case we attempt to resolve it too.
        return getVariableValue(fallback, element, depth + 1);
    }
    else {
        return fallback;
    }
}
/**
 * Resolve CSS variables from
 *
 * @internal
 */
function resolveCSSVariables(visualElement, _a, transitionEnd) {
    var _b;
    var target = tslib.__rest(_a, []);
    const element = visualElement.getInstance();
    if (!(element instanceof Element))
        return { target, transitionEnd };
    // If `transitionEnd` isn't `undefined`, clone it. We could clone `target` and `transitionEnd`
    // only if they change but I think this reads clearer and this isn't a performance-critical path.
    if (transitionEnd) {
        transitionEnd = Object.assign({}, transitionEnd);
    }
    // Go through existing `MotionValue`s and ensure any existing CSS variables are resolved
    visualElement.forEachValue((value) => {
        const current = value.get();
        if (!isCSSVariable(current))
            return;
        const resolved = getVariableValue(current, element);
        if (resolved)
            value.set(resolved);
    });
    // Cycle through every target property and resolve CSS variables. Currently
    // we only read single-var properties like `var(--foo)`, not `calc(var(--foo) + 20px)`
    for (const key in target) {
        const current = target[key];
        if (!isCSSVariable(current))
            continue;
        const resolved = getVariableValue(current, element);
        if (!resolved)
            continue;
        // Clone target if it hasn't already been
        target[key] = resolved;
        // If the user hasn't already set this key on `transitionEnd`, set it to the unresolved
        // CSS variable. This will ensure that after the animation the component will reflect
        // changes in the value of the CSS variable.
        if (transitionEnd)
            (_b = transitionEnd[key]) !== null && _b !== void 0 ? _b : (transitionEnd[key] = current);
    }
    return { target, transitionEnd };
}

const positionalKeys = new Set([
    "width",
    "height",
    "top",
    "left",
    "right",
    "bottom",
    "x",
    "y",
]);
const isPositionalKey = (key) => positionalKeys.has(key);
const hasPositionalKey = (target) => {
    return Object.keys(target).some(isPositionalKey);
};
const setAndResetVelocity = (value, to) => {
    // Looks odd but setting it twice doesn't render, it'll just
    // set both prev and current to the latest value
    value.set(to, false);
    value.set(to);
};
const isNumOrPxType = (v) => v === styleValueTypes.number || v === styleValueTypes.px;
var BoundingBoxDimension;
(function (BoundingBoxDimension) {
    BoundingBoxDimension["width"] = "width";
    BoundingBoxDimension["height"] = "height";
    BoundingBoxDimension["left"] = "left";
    BoundingBoxDimension["right"] = "right";
    BoundingBoxDimension["top"] = "top";
    BoundingBoxDimension["bottom"] = "bottom";
})(BoundingBoxDimension || (BoundingBoxDimension = {}));
const getPosFromMatrix = (matrix, pos) => parseFloat(matrix.split(", ")[pos]);
const getTranslateFromMatrix = (pos2, pos3) => (_bbox, { transform }) => {
    if (transform === "none" || !transform)
        return 0;
    const matrix3d = transform.match(/^matrix3d\((.+)\)$/);
    if (matrix3d) {
        return getPosFromMatrix(matrix3d[1], pos3);
    }
    else {
        const matrix = transform.match(/^matrix\((.+)\)$/);
        if (matrix) {
            return getPosFromMatrix(matrix[1], pos2);
        }
        else {
            return 0;
        }
    }
};
const transformKeys = new Set(["x", "y", "z"]);
const nonTranslationalTransformKeys = transformProps.filter((key) => !transformKeys.has(key));
function removeNonTranslationalTransform(visualElement) {
    const removedTransforms = [];
    nonTranslationalTransformKeys.forEach((key) => {
        const value = visualElement.getValue(key);
        if (value !== undefined) {
            removedTransforms.push([key, value.get()]);
            value.set(key.startsWith("scale") ? 1 : 0);
        }
    });
    // Apply changes to element before measurement
    if (removedTransforms.length)
        visualElement.syncRender();
    return removedTransforms;
}
const positionalValues = {
    // Dimensions
    width: ({ x }, { paddingLeft = "0", paddingRight = "0" }) => x.max - x.min - parseFloat(paddingLeft) - parseFloat(paddingRight),
    height: ({ y }, { paddingTop = "0", paddingBottom = "0" }) => y.max - y.min - parseFloat(paddingTop) - parseFloat(paddingBottom),
    top: (_bbox, { top }) => parseFloat(top),
    left: (_bbox, { left }) => parseFloat(left),
    bottom: ({ y }, { top }) => parseFloat(top) + (y.max - y.min),
    right: ({ x }, { left }) => parseFloat(left) + (x.max - x.min),
    // Transform
    x: getTranslateFromMatrix(4, 13),
    y: getTranslateFromMatrix(5, 14),
};
const convertChangedValueTypes = (target, visualElement, changedKeys) => {
    const originBbox = visualElement.measureViewportBox();
    const element = visualElement.getInstance();
    const elementComputedStyle = getComputedStyle(element);
    const { display } = elementComputedStyle;
    const origin = {};
    // If the element is currently set to display: "none", make it visible before
    // measuring the target bounding box
    if (display === "none") {
        visualElement.setStaticValue("display", target.display || "block");
    }
    /**
     * Record origins before we render and update styles
     */
    changedKeys.forEach((key) => {
        origin[key] = positionalValues[key](originBbox, elementComputedStyle);
    });
    // Apply the latest values (as set in checkAndConvertChangedValueTypes)
    visualElement.syncRender();
    const targetBbox = visualElement.measureViewportBox();
    changedKeys.forEach((key) => {
        // Restore styles to their **calculated computed style**, not their actual
        // originally set style. This allows us to animate between equivalent pixel units.
        const value = visualElement.getValue(key);
        setAndResetVelocity(value, origin[key]);
        target[key] = positionalValues[key](targetBbox, elementComputedStyle);
    });
    return target;
};
const checkAndConvertChangedValueTypes = (visualElement, target, origin = {}, transitionEnd = {}) => {
    target = Object.assign({}, target);
    transitionEnd = Object.assign({}, transitionEnd);
    const targetPositionalKeys = Object.keys(target).filter(isPositionalKey);
    // We want to remove any transform values that could affect the element's bounding box before
    // it's measured. We'll reapply these later.
    let removedTransformValues = [];
    let hasAttemptedToRemoveTransformValues = false;
    const changedValueTypeKeys = [];
    targetPositionalKeys.forEach((key) => {
        const value = visualElement.getValue(key);
        if (!visualElement.hasValue(key))
            return;
        let from = origin[key];
        let fromType = findDimensionValueType(from);
        const to = target[key];
        let toType;
        // TODO: The current implementation of this basically throws an error
        // if you try and do value conversion via keyframes. There's probably
        // a way of doing this but the performance implications would need greater scrutiny,
        // as it'd be doing multiple resize-remeasure operations.
        if (isKeyframesTarget(to)) {
            const numKeyframes = to.length;
            const fromIndex = to[0] === null ? 1 : 0;
            from = to[fromIndex];
            fromType = findDimensionValueType(from);
            for (let i = fromIndex; i < numKeyframes; i++) {
                if (!toType) {
                    toType = findDimensionValueType(to[i]);
                    heyListen.invariant(toType === fromType ||
                        (isNumOrPxType(fromType) && isNumOrPxType(toType)), "Keyframes must be of the same dimension as the current value");
                }
                else {
                    heyListen.invariant(findDimensionValueType(to[i]) === toType, "All keyframes must be of the same type");
                }
            }
        }
        else {
            toType = findDimensionValueType(to);
        }
        if (fromType !== toType) {
            // If they're both just number or px, convert them both to numbers rather than
            // relying on resize/remeasure to convert (which is wasteful in this situation)
            if (isNumOrPxType(fromType) && isNumOrPxType(toType)) {
                const current = value.get();
                if (typeof current === "string") {
                    value.set(parseFloat(current));
                }
                if (typeof to === "string") {
                    target[key] = parseFloat(to);
                }
                else if (Array.isArray(to) && toType === styleValueTypes.px) {
                    target[key] = to.map(parseFloat);
                }
            }
            else if ((fromType === null || fromType === void 0 ? void 0 : fromType.transform) &&
                (toType === null || toType === void 0 ? void 0 : toType.transform) &&
                (from === 0 || to === 0)) {
                // If one or the other value is 0, it's safe to coerce it to the
                // type of the other without measurement
                if (from === 0) {
                    value.set(toType.transform(from));
                }
                else {
                    target[key] = fromType.transform(to);
                }
            }
            else {
                // If we're going to do value conversion via DOM measurements, we first
                // need to remove non-positional transform values that could affect the bbox measurements.
                if (!hasAttemptedToRemoveTransformValues) {
                    removedTransformValues =
                        removeNonTranslationalTransform(visualElement);
                    hasAttemptedToRemoveTransformValues = true;
                }
                changedValueTypeKeys.push(key);
                transitionEnd[key] =
                    transitionEnd[key] !== undefined
                        ? transitionEnd[key]
                        : target[key];
                setAndResetVelocity(value, to);
            }
        }
    });
    if (changedValueTypeKeys.length) {
        const scrollY = changedValueTypeKeys.indexOf("height") >= 0
            ? window.pageYOffset
            : null;
        const convertedTarget = convertChangedValueTypes(target, visualElement, changedValueTypeKeys);
        // If we removed transform values, reapply them before the next render
        if (removedTransformValues.length) {
            removedTransformValues.forEach(([key, value]) => {
                visualElement.getValue(key).set(value);
            });
        }
        // Reapply original values
        visualElement.syncRender();
        // Restore scroll position
        if (isBrowser && scrollY !== null) {
            window.scrollTo({ top: scrollY });
        }
        return { target: convertedTarget, transitionEnd };
    }
    else {
        return { target, transitionEnd };
    }
};
/**
 * Convert value types for x/y/width/height/top/left/bottom/right
 *
 * Allows animation between `'auto'` -> `'100%'` or `0` -> `'calc(50% - 10vw)'`
 *
 * @internal
 */
function unitConversion(visualElement, target, origin, transitionEnd) {
    return hasPositionalKey(target)
        ? checkAndConvertChangedValueTypes(visualElement, target, origin, transitionEnd)
        : { target, transitionEnd };
}

/**
 * Parse a DOM variant to make it animatable. This involves resolving CSS variables
 * and ensuring animations like "20%" => "calc(50vw)" are performed in pixels.
 */
const parseDomVariant = (visualElement, target, origin, transitionEnd) => {
    const resolved = resolveCSSVariables(visualElement, target, transitionEnd);
    target = resolved.target;
    transitionEnd = resolved.transitionEnd;
    return unitConversion(visualElement, target, origin, transitionEnd);
};

function getComputedStyle$1(element) {
    return window.getComputedStyle(element);
}
const htmlConfig = {
    treeType: "dom",
    readValueFromInstance(domElement, key) {
        if (isTransformProp(key)) {
            const defaultType = getDefaultValueType(key);
            return defaultType ? defaultType.default || 0 : 0;
        }
        else {
            const computedStyle = getComputedStyle$1(domElement);
            const value = (isCSSVariable$1(key)
                ? computedStyle.getPropertyValue(key)
                : computedStyle[key]) || 0;
            return typeof value === "string" ? value.trim() : value;
        }
    },
    sortNodePosition(a, b) {
        /**
         * compareDocumentPosition returns a bitmask, by using the bitwise &
         * we're returning true if 2 in that bitmask is set to true. 2 is set
         * to true if b preceeds a.
         */
        return a.compareDocumentPosition(b) & 2 ? 1 : -1;
    },
    getBaseTarget(props, key) {
        var _a;
        return (_a = props.style) === null || _a === void 0 ? void 0 : _a[key];
    },
    measureViewportBox(element, { transformPagePoint }) {
        return measureViewportBox(element, transformPagePoint);
    },
    /**
     * Reset the transform on the current Element. This is called as part
     * of a batched process across the entire layout tree. To remove this write
     * cycle it'd be interesting to see if it's possible to "undo" all the current
     * layout transforms up the tree in the same way this.getBoundingBoxWithoutTransforms
     * works
     */
    resetTransform(element, domElement, props) {
        const { transformTemplate } = props;
        domElement.style.transform = transformTemplate
            ? transformTemplate({}, "")
            : "none";
        // Ensure that whatever happens next, we restore our transform on the next frame
        element.scheduleRender();
    },
    restoreTransform(instance, mutableState) {
        instance.style.transform = mutableState.style.transform;
    },
    removeValueFromRenderState(key, { vars, style }) {
        delete vars[key];
        delete style[key];
    },
    /**
     * Ensure that HTML and Framer-specific value types like `px`->`%` and `Color`
     * can be animated by Motion.
     */
    makeTargetAnimatable(element, _a, _b, isMounted) {
        var { transition, transitionEnd } = _a, target = tslib.__rest(_a, ["transition", "transitionEnd"]);
        var transformValues = _b.transformValues;
        if (isMounted === void 0) { isMounted = true; }
        let origin = getOrigin(target, transition || {}, element);
        /**
         * If Framer has provided a function to convert `Color` etc value types, convert them
         */
        if (transformValues) {
            if (transitionEnd)
                transitionEnd = transformValues(transitionEnd);
            if (target)
                target = transformValues(target);
            if (origin)
                origin = transformValues(origin);
        }
        if (isMounted) {
            checkTargetForNewValues(element, target, origin);
            const parsed = parseDomVariant(element, target, origin, transitionEnd);
            transitionEnd = parsed.transitionEnd;
            target = parsed.target;
        }
        return Object.assign({ transition,
            transitionEnd }, target);
    },
    scrapeMotionValuesFromProps: scrapeMotionValuesFromProps$1,
    build(element, renderState, latestValues, options, props) {
        if (element.isVisible !== undefined) {
            renderState.style.visibility = element.isVisible
                ? "visible"
                : "hidden";
        }
        buildHTMLStyles(renderState, latestValues, options, props.transformTemplate);
    },
    render: renderHTML,
};
const htmlVisualElement = visualElement(htmlConfig);

const svgVisualElement = visualElement(Object.assign(Object.assign({}, htmlConfig), { getBaseTarget(props, key) {
        return props[key];
    },
    readValueFromInstance(domElement, key) {
        var _a;
        if (isTransformProp(key)) {
            return ((_a = getDefaultValueType(key)) === null || _a === void 0 ? void 0 : _a.default) || 0;
        }
        key = !camelCaseAttributes.has(key) ? camelToDash(key) : key;
        return domElement.getAttribute(key);
    },
    scrapeMotionValuesFromProps,
    build(_element, renderState, latestValues, options, props) {
        buildSVGAttrs(renderState, latestValues, options, props.transformTemplate);
    }, render: renderSVG }));

const createDomVisualElement = (Component, options) => {
    return isSVGComponent(Component)
        ? svgVisualElement(options, { enableHardwareAcceleration: false })
        : htmlVisualElement(options, { enableHardwareAcceleration: true });
};

function pixelsToPercent(pixels, axis) {
    if (axis.max === axis.min)
        return 0;
    return (pixels / (axis.max - axis.min)) * 100;
}
/**
 * We always correct borderRadius as a percentage rather than pixels to reduce paints.
 * For example, if you are projecting a box that is 100px wide with a 10px borderRadius
 * into a box that is 200px wide with a 20px borderRadius, that is actually a 10%
 * borderRadius in both states. If we animate between the two in pixels that will trigger
 * a paint each time. If we animate between the two in percentage we'll avoid a paint.
 */
const correctBorderRadius = {
    correct: (latest, node) => {
        if (!node.target)
            return latest;
        /**
         * If latest is a string, if it's a percentage we can return immediately as it's
         * going to be stretched appropriately. Otherwise, if it's a pixel, convert it to a number.
         */
        if (typeof latest === "string") {
            if (styleValueTypes.px.test(latest)) {
                latest = parseFloat(latest);
            }
            else {
                return latest;
            }
        }
        /**
         * If latest is a number, it's a pixel value. We use the current viewportBox to calculate that
         * pixel value as a percentage of each axis
         */
        const x = pixelsToPercent(latest, node.target.x);
        const y = pixelsToPercent(latest, node.target.y);
        return `${x}% ${y}%`;
    },
};

const varToken = "_$css";
const correctBoxShadow = {
    correct: (latest, { treeScale, projectionDelta }) => {
        const original = latest;
        /**
         * We need to first strip and store CSS variables from the string.
         */
        const containsCSSVariables = latest.includes("var(");
        const cssVariables = [];
        if (containsCSSVariables) {
            latest = latest.replace(cssVariableRegex, (match) => {
                cssVariables.push(match);
                return varToken;
            });
        }
        const shadow = styleValueTypes.complex.parse(latest);
        // TODO: Doesn't support multiple shadows
        if (shadow.length > 5)
            return original;
        const template = styleValueTypes.complex.createTransformer(latest);
        const offset = typeof shadow[0] !== "number" ? 1 : 0;
        // Calculate the overall context scale
        const xScale = projectionDelta.x.scale * treeScale.x;
        const yScale = projectionDelta.y.scale * treeScale.y;
        shadow[0 + offset] /= xScale;
        shadow[1 + offset] /= yScale;
        /**
         * Ideally we'd correct x and y scales individually, but because blur and
         * spread apply to both we have to take a scale average and apply that instead.
         * We could potentially improve the outcome of this by incorporating the ratio between
         * the two scales.
         */
        const averageScale = popmotion.mix(xScale, yScale, 0.5);
        // Blur
        if (typeof shadow[2 + offset] === "number")
            shadow[2 + offset] /= averageScale;
        // Spread
        if (typeof shadow[3 + offset] === "number")
            shadow[3 + offset] /= averageScale;
        let output = template(shadow);
        if (containsCSSVariables) {
            let i = 0;
            output = output.replace(varToken, () => {
                const cssVariable = cssVariables[i];
                i++;
                return cssVariable;
            });
        }
        return output;
    },
};

class MeasureLayoutWithContext extends React__default["default"].Component {
    /**
     * This only mounts projection nodes for components that
     * need measuring, we might want to do it for all components
     * in order to incorporate transforms
     */
    componentDidMount() {
        const { visualElement, layoutGroup, switchLayoutGroup, layoutId } = this.props;
        const { projection } = visualElement;
        addScaleCorrector(defaultScaleCorrectors);
        if (projection) {
            if (layoutGroup === null || layoutGroup === void 0 ? void 0 : layoutGroup.group)
                layoutGroup.group.add(projection);
            if ((switchLayoutGroup === null || switchLayoutGroup === void 0 ? void 0 : switchLayoutGroup.register) && layoutId) {
                switchLayoutGroup.register(projection);
            }
            projection.root.didUpdate();
            projection.addEventListener("animationComplete", () => {
                this.safeToRemove();
            });
            projection.setOptions(Object.assign(Object.assign({}, projection.options), { onExitComplete: () => this.safeToRemove() }));
        }
        globalProjectionState.hasEverUpdated = true;
    }
    getSnapshotBeforeUpdate(prevProps) {
        const { layoutDependency, visualElement, drag, isPresent } = this.props;
        const projection = visualElement.projection;
        if (!projection)
            return null;
        /**
         * TODO: We use this data in relegate to determine whether to
         * promote a previous element. There's no guarantee its presence data
         * will have updated by this point - if a bug like this arises it will
         * have to be that we markForRelegation and then find a new lead some other way,
         * perhaps in didUpdate
         */
        projection.isPresent = isPresent;
        if (drag ||
            prevProps.layoutDependency !== layoutDependency ||
            layoutDependency === undefined) {
            projection.willUpdate();
        }
        else {
            this.safeToRemove();
        }
        if (prevProps.isPresent !== isPresent) {
            if (isPresent) {
                projection.promote();
            }
            else if (!projection.relegate()) {
                /**
                 * If there's another stack member taking over from this one,
                 * it's in charge of the exit animation and therefore should
                 * be in charge of the safe to remove. Otherwise we call it here.
                 */
                sync__default["default"].postRender(() => {
                    var _a;
                    if (!((_a = projection.getStack()) === null || _a === void 0 ? void 0 : _a.members.length)) {
                        this.safeToRemove();
                    }
                });
            }
        }
        return null;
    }
    componentDidUpdate() {
        const { projection } = this.props.visualElement;
        if (projection) {
            projection.root.didUpdate();
            if (!projection.currentAnimation && projection.isLead()) {
                this.safeToRemove();
            }
        }
    }
    componentWillUnmount() {
        const { visualElement, layoutGroup, switchLayoutGroup: promoteContext, } = this.props;
        const { projection } = visualElement;
        if (projection) {
            projection.scheduleCheckAfterUnmount();
            if (layoutGroup === null || layoutGroup === void 0 ? void 0 : layoutGroup.group)
                layoutGroup.group.remove(projection);
            if (promoteContext === null || promoteContext === void 0 ? void 0 : promoteContext.deregister)
                promoteContext.deregister(projection);
        }
    }
    safeToRemove() {
        const { safeToRemove } = this.props;
        safeToRemove === null || safeToRemove === void 0 ? void 0 : safeToRemove();
    }
    render() {
        return null;
    }
}
function MeasureLayout(props) {
    const [isPresent, safeToRemove] = usePresence();
    const layoutGroup = React.useContext(LayoutGroupContext);
    return (React__default["default"].createElement(MeasureLayoutWithContext, Object.assign({}, props, { layoutGroup: layoutGroup, switchLayoutGroup: React.useContext(SwitchLayoutGroupContext), isPresent: isPresent, safeToRemove: safeToRemove })));
}
const defaultScaleCorrectors = {
    borderRadius: Object.assign(Object.assign({}, correctBorderRadius), { applyTo: [
            "borderTopLeftRadius",
            "borderTopRightRadius",
            "borderBottomLeftRadius",
            "borderBottomRightRadius",
        ] }),
    borderTopLeftRadius: correctBorderRadius,
    borderTopRightRadius: correctBorderRadius,
    borderBottomLeftRadius: correctBorderRadius,
    borderBottomRightRadius: correctBorderRadius,
    boxShadow: correctBoxShadow,
};

const layoutFeatures = {
    measureLayout: MeasureLayout,
};

/**
 * Animate a single value or a `MotionValue`.
 *
 * The first argument is either a `MotionValue` to animate, or an initial animation value.
 *
 * The second is either a value to animate to, or an array of keyframes to animate through.
 *
 * The third argument can be either tween or spring options, and optional lifecycle methods: `onUpdate`, `onPlay`, `onComplete`, `onRepeat` and `onStop`.
 *
 * Returns `AnimationPlaybackControls`, currently just a `stop` method.
 *
 * ```javascript
 * const x = useMotionValue(0)
 *
 * useEffect(() => {
 *   const controls = animate(x, 100, {
 *     type: "spring",
 *     stiffness: 2000,
 *     onComplete: v => {}
 *   })
 *
 *   return controls.stop
 * })
 * ```
 *
 * @public
 */
function animate(from, to, transition = {}) {
    const value = isMotionValue(from) ? from : motionValue(from);
    startAnimation("", value, to, transition);
    return {
        stop: () => value.stop(),
        isAnimating: () => value.isAnimating(),
    };
}

const borders = ["TopLeft", "TopRight", "BottomLeft", "BottomRight"];
const numBorders = borders.length;
const asNumber = (value) => typeof value === "string" ? parseFloat(value) : value;
const isPx = (value) => typeof value === "number" || styleValueTypes.px.test(value);
function mixValues(target, follow, lead, progress, shouldCrossfadeOpacity, isOnlyMember) {
    var _a, _b, _c, _d;
    if (shouldCrossfadeOpacity) {
        target.opacity = popmotion.mix(0, 
        // (follow?.opacity as number) ?? 0,
        // TODO Reinstate this if only child
        (_a = lead.opacity) !== null && _a !== void 0 ? _a : 1, easeCrossfadeIn(progress));
        target.opacityExit = popmotion.mix((_b = follow.opacity) !== null && _b !== void 0 ? _b : 1, 0, easeCrossfadeOut(progress));
    }
    else if (isOnlyMember) {
        target.opacity = popmotion.mix((_c = follow.opacity) !== null && _c !== void 0 ? _c : 1, (_d = lead.opacity) !== null && _d !== void 0 ? _d : 1, progress);
    }
    /**
     * Mix border radius
     */
    for (let i = 0; i < numBorders; i++) {
        const borderLabel = `border${borders[i]}Radius`;
        let followRadius = getRadius(follow, borderLabel);
        let leadRadius = getRadius(lead, borderLabel);
        if (followRadius === undefined && leadRadius === undefined)
            continue;
        followRadius || (followRadius = 0);
        leadRadius || (leadRadius = 0);
        const canMix = followRadius === 0 ||
            leadRadius === 0 ||
            isPx(followRadius) === isPx(leadRadius);
        if (canMix) {
            target[borderLabel] = Math.max(popmotion.mix(asNumber(followRadius), asNumber(leadRadius), progress), 0);
            if (styleValueTypes.percent.test(leadRadius) || styleValueTypes.percent.test(followRadius)) {
                target[borderLabel] += "%";
            }
        }
        else {
            target[borderLabel] = leadRadius;
        }
    }
    /**
     * Mix rotation
     */
    if (follow.rotate || lead.rotate) {
        target.rotate = popmotion.mix(follow.rotate || 0, lead.rotate || 0, progress);
    }
}
function getRadius(values, radiusName) {
    var _a;
    return (_a = values[radiusName]) !== null && _a !== void 0 ? _a : values.borderRadius;
}
// /**
//  * We only want to mix the background color if there's a follow element
//  * that we're not crossfading opacity between. For instance with switch
//  * AnimateSharedLayout animations, this helps the illusion of a continuous
//  * element being animated but also cuts down on the number of paints triggered
//  * for elements where opacity is doing that work for us.
//  */
// if (
//     !hasFollowElement &&
//     latestLeadValues.backgroundColor &&
//     latestFollowValues.backgroundColor
// ) {
//     /**
//      * This isn't ideal performance-wise as mixColor is creating a new function every frame.
//      * We could probably create a mixer that runs at the start of the animation but
//      * the idea behind the crossfader is that it runs dynamically between two potentially
//      * changing targets (ie opacity or borderRadius may be animating independently via variants)
//      */
//     leadState.backgroundColor = followState.backgroundColor = mixColor(
//         latestFollowValues.backgroundColor as string,
//         latestLeadValues.backgroundColor as string
//     )(p)
// }
const easeCrossfadeIn = compress(0, 0.5, popmotion.circOut);
const easeCrossfadeOut = compress(0.5, 0.95, popmotion.linear);
function compress(min, max, easing) {
    return (p) => {
        // Could replace ifs with clamp
        if (p < min)
            return 0;
        if (p > max)
            return 1;
        return easing(popmotion.progress(min, max, p));
    };
}

/**
 * Reset an axis to the provided origin box.
 *
 * This is a mutative operation.
 */
function copyAxisInto(axis, originAxis) {
    axis.min = originAxis.min;
    axis.max = originAxis.max;
}
/**
 * Reset a box to the provided origin box.
 *
 * This is a mutative operation.
 */
function copyBoxInto(box, originBox) {
    copyAxisInto(box.x, originBox.x);
    copyAxisInto(box.y, originBox.y);
}

/**
 * Remove a delta from a point. This is essentially the steps of applyPointDelta in reverse
 */
function removePointDelta(point, translate, scale, originPoint, boxScale) {
    point -= translate;
    point = scalePoint(point, 1 / scale, originPoint);
    if (boxScale !== undefined) {
        point = scalePoint(point, 1 / boxScale, originPoint);
    }
    return point;
}
/**
 * Remove a delta from an axis. This is essentially the steps of applyAxisDelta in reverse
 */
function removeAxisDelta(axis, translate = 0, scale = 1, origin = 0.5, boxScale, originAxis = axis, sourceAxis = axis) {
    if (styleValueTypes.percent.test(translate)) {
        translate = parseFloat(translate);
        const relativeProgress = popmotion.mix(sourceAxis.min, sourceAxis.max, translate / 100);
        translate = relativeProgress - sourceAxis.min;
    }
    if (typeof translate !== "number")
        return;
    let originPoint = popmotion.mix(originAxis.min, originAxis.max, origin);
    if (axis === originAxis)
        originPoint -= translate;
    axis.min = removePointDelta(axis.min, translate, scale, originPoint, boxScale);
    axis.max = removePointDelta(axis.max, translate, scale, originPoint, boxScale);
}
/**
 * Remove a transforms from an axis. This is essentially the steps of applyAxisTransforms in reverse
 * and acts as a bridge between motion values and removeAxisDelta
 */
function removeAxisTransforms(axis, transforms, [key, scaleKey, originKey], origin, sourceAxis) {
    removeAxisDelta(axis, transforms[key], transforms[scaleKey], transforms[originKey], transforms.scale, origin, sourceAxis);
}
/**
 * The names of the motion values we want to apply as translation, scale and origin.
 */
const xKeys = ["x", "scaleX", "originX"];
const yKeys = ["y", "scaleY", "originY"];
/**
 * Remove a transforms from an box. This is essentially the steps of applyAxisBox in reverse
 * and acts as a bridge between motion values and removeAxisDelta
 */
function removeBoxTransforms(box, transforms, originBox, sourceBox) {
    removeAxisTransforms(box.x, transforms, xKeys, originBox === null || originBox === void 0 ? void 0 : originBox.x, sourceBox === null || sourceBox === void 0 ? void 0 : sourceBox.x);
    removeAxisTransforms(box.y, transforms, yKeys, originBox === null || originBox === void 0 ? void 0 : originBox.y, sourceBox === null || sourceBox === void 0 ? void 0 : sourceBox.y);
}

function isAxisDeltaZero(delta) {
    return delta.translate === 0 && delta.scale === 1;
}
function isDeltaZero(delta) {
    return isAxisDeltaZero(delta.x) && isAxisDeltaZero(delta.y);
}
function boxEquals(a, b) {
    return (a.x.min === b.x.min &&
        a.x.max === b.x.max &&
        a.y.min === b.y.min &&
        a.y.max === b.y.max);
}

class NodeStack {
    constructor() {
        this.members = [];
    }
    add(node) {
        addUniqueItem(this.members, node);
        node.scheduleRender();
    }
    remove(node) {
        removeItem(this.members, node);
        if (node === this.prevLead) {
            this.prevLead = undefined;
        }
        if (node === this.lead) {
            const prevLead = this.members[this.members.length - 1];
            if (prevLead) {
                this.promote(prevLead);
            }
        }
    }
    relegate(node) {
        const indexOfNode = this.members.findIndex((member) => node === member);
        if (indexOfNode === 0)
            return false;
        /**
         * Find the next projection node that is present
         */
        let prevLead;
        for (let i = indexOfNode; i >= 0; i--) {
            const member = this.members[i];
            if (member.isPresent !== false) {
                prevLead = member;
                break;
            }
        }
        if (prevLead) {
            this.promote(prevLead);
            return true;
        }
        else {
            return false;
        }
    }
    promote(node, preserveFollowOpacity) {
        var _a;
        const prevLead = this.lead;
        if (node === prevLead)
            return;
        this.prevLead = prevLead;
        this.lead = node;
        node.show();
        if (prevLead) {
            prevLead.instance && prevLead.scheduleRender();
            node.scheduleRender();
            node.resumeFrom = prevLead;
            if (preserveFollowOpacity) {
                node.resumeFrom.preserveOpacity = true;
            }
            if (prevLead.snapshot) {
                node.snapshot = prevLead.snapshot;
                node.snapshot.latestValues =
                    prevLead.animationValues || prevLead.latestValues;
                node.snapshot.isShared = true;
            }
            if ((_a = node.root) === null || _a === void 0 ? void 0 : _a.isUpdating) {
                node.isLayoutDirty = true;
            }
            const { crossfade } = node.options;
            if (crossfade === false) {
                prevLead.hide();
            }
            /**
             * TODO:
             *   - Test border radius when previous node was deleted
             *   - boxShadow mixing
             *   - Shared between element A in scrolled container and element B (scroll stays the same or changes)
             *   - Shared between element A in transformed container and element B (transform stays the same or changes)
             *   - Shared between element A in scrolled page and element B (scroll stays the same or changes)
             * ---
             *   - Crossfade opacity of root nodes
             *   - layoutId changes after animation
             *   - layoutId changes mid animation
             */
        }
    }
    exitAnimationComplete() {
        this.members.forEach((node) => {
            var _a, _b, _c, _d, _e;
            (_b = (_a = node.options).onExitComplete) === null || _b === void 0 ? void 0 : _b.call(_a);
            (_e = (_c = node.resumingFrom) === null || _c === void 0 ? void 0 : (_d = _c.options).onExitComplete) === null || _e === void 0 ? void 0 : _e.call(_d);
        });
    }
    scheduleRender() {
        this.members.forEach((node) => {
            node.instance && node.scheduleRender(false);
        });
    }
    /**
     * Clear any leads that have been removed this render to prevent them from being
     * used in future animations and to prevent memory leaks
     */
    removeLeadSnapshot() {
        if (this.lead && this.lead.snapshot) {
            this.lead.snapshot = undefined;
        }
    }
}

const identityProjection = "translate3d(0px, 0px, 0) scale(1, 1) scale(1, 1)";
function buildProjectionTransform(delta, treeScale, latestTransform) {
    /**
     * The translations we use to calculate are always relative to the viewport coordinate space.
     * But when we apply scales, we also scale the coordinate space of an element and its children.
     * For instance if we have a treeScale (the culmination of all parent scales) of 0.5 and we need
     * to move an element 100 pixels, we actually need to move it 200 in within that scaled space.
     */
    const xTranslate = delta.x.translate / treeScale.x;
    const yTranslate = delta.y.translate / treeScale.y;
    let transform = `translate3d(${xTranslate}px, ${yTranslate}px, 0) `;
    /**
     * Apply scale correction for the tree transform.
     * This will apply scale to the screen-orientated axes.
     */
    transform += `scale(${1 / treeScale.x}, ${1 / treeScale.y}) `;
    if (latestTransform) {
        const { rotate, rotateX, rotateY } = latestTransform;
        if (rotate)
            transform += `rotate(${rotate}deg) `;
        if (rotateX)
            transform += `rotateX(${rotateX}deg) `;
        if (rotateY)
            transform += `rotateY(${rotateY}deg) `;
    }
    /**
     * Apply scale to match the size of the element to the size we want it.
     * This will apply scale to the element-orientated axes.
     */
    const elementScaleX = delta.x.scale * treeScale.x;
    const elementScaleY = delta.y.scale * treeScale.y;
    transform += `scale(${elementScaleX}, ${elementScaleY})`;
    return transform === identityProjection ? "none" : transform;
}

const compareByDepth = (a, b) => a.depth - b.depth;

class FlatTree {
    constructor() {
        this.children = [];
        this.isDirty = false;
    }
    add(child) {
        addUniqueItem(this.children, child);
        this.isDirty = true;
    }
    remove(child) {
        removeItem(this.children, child);
        this.isDirty = true;
    }
    forEach(callback) {
        this.isDirty && this.children.sort(compareByDepth);
        this.isDirty = false;
        this.children.forEach(callback);
    }
}

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
            sync.cancelSync.preRender(this.updateProjection);
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
            sync.flushSync.update();
            sync.flushSync.preRender();
            sync.flushSync.render();
        }
        clearAllSnapshots() {
            this.nodes.forEach(clearSnapshot);
            this.sharedNodes.forEach(removeLeadSnapshots);
        }
        scheduleUpdateProjection() {
            sync__default["default"].preRender(this.updateProjection, false, true);
        }
        scheduleCheckAfterUnmount() {
            /**
             * If the unmounting node is in a layoutGroup and did trigger a willUpdate,
             * we manually call didUpdate to give a chance to the siblings to animate.
             * Otherwise, cleanup all snapshots to prevents future nodes from reusing them.
             */
            sync__default["default"].postRender(() => {
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
                sync.cancelSync.update(this.pendingAnimation);
                this.pendingAnimation = undefined;
            }
            /**
             * Start the animation in the next frame to have a frame with progress 0,
             * where the target is the same as when the animation started, so we can
             * calculate the relative positions correctly for instant transitions.
             */
            this.pendingAnimation = sync__default["default"].update(() => {
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
    output.translate = popmotion.mix(delta.translate, 0, p);
    output.scale = popmotion.mix(delta.scale, 1, p);
    output.origin = delta.origin;
    output.originPoint = delta.originPoint;
}
function mixAxis(output, from, to, p) {
    output.min = popmotion.mix(from.min, to.min, p);
    output.max = popmotion.mix(from.max, to.max, p);
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

const DocumentProjectionNode = createProjectionNode({
    attachResizeListener: (ref, notify) => addDomEvent(ref, "resize", notify),
    measureScroll: () => ({
        x: document.documentElement.scrollLeft || document.body.scrollLeft,
        y: document.documentElement.scrollTop || document.body.scrollTop,
    }),
    checkIsScrollRoot: () => true,
});

const rootProjectionNode = {
    current: undefined,
};
const HTMLProjectionNode = createProjectionNode({
    measureScroll: (instance) => ({
        x: instance.scrollLeft,
        y: instance.scrollTop,
    }),
    defaultParent: () => {
        if (!rootProjectionNode.current) {
            const documentNode = new DocumentProjectionNode(0, {});
            documentNode.mount(window);
            documentNode.setOptions({ layoutScroll: true });
            rootProjectionNode.current = documentNode;
        }
        return rootProjectionNode.current;
    },
    resetTransform: (instance, value) => {
        instance.style.transform = value !== null && value !== void 0 ? value : "none";
    },
    checkIsScrollRoot: (instance) => Boolean(window.getComputedStyle(instance).position === "fixed"),
});

const featureBundle = Object.assign(Object.assign(Object.assign(Object.assign({}, animations), gestureAnimations), drag), layoutFeatures);
/**
 * HTML & SVG components, optimised for use with gestures and animation. These can be used as
 * drop-in replacements for any HTML & SVG component, all CSS & SVG properties are supported.
 *
 * @public
 */
const motion = /*@__PURE__*/ createMotionProxy((Component, config) => createDomMotionConfig(Component, config, featureBundle, createDomVisualElement, HTMLProjectionNode));
/**
 * Create a DOM `motion` component with the provided string. This is primarily intended
 * as a full alternative to `motion` for consumers who have to support environments that don't
 * support `Proxy`.
 *
 * ```javascript
 * import { createDomMotionComponent } from "framer-motion"
 *
 * const motion = {
 *   div: createDomMotionComponent('div')
 * }
 * ```
 *
 * @public
 */
function createDomMotionComponent(key) {
    return createMotionComponent(createDomMotionConfig(key, { forwardMotionProps: false }, featureBundle, createDomVisualElement, HTMLProjectionNode));
}

/**
 * @public
 */
const m = createMotionProxy(createDomMotionConfig);

function useIsMounted() {
    const isMounted = React.useRef(false);
    useIsomorphicLayoutEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);
    return isMounted;
}

function useForceUpdate() {
    const isMounted = useIsMounted();
    const [forcedRenderCount, setForcedRenderCount] = React.useState(0);
    const forceRender = React.useCallback(() => {
        isMounted.current && setForcedRenderCount(forcedRenderCount + 1);
    }, [forcedRenderCount]);
    /**
     * Defer this to the end of the next animation frame in case there are multiple
     * synchronous calls.
     */
    const deferredForceRender = React.useCallback(() => sync__default["default"].postRender(forceRender), [forceRender]);
    return [deferredForceRender, forcedRenderCount];
}

/**
 * Measurement functionality has to be within a separate component
 * to leverage snapshot lifecycle.
 */
class PopChildMeasure extends React__namespace.Component {
    getSnapshotBeforeUpdate(prevProps) {
        const element = this.props.childRef.current;
        if (element && prevProps.isPresent && !this.props.isPresent) {
            const size = this.props.sizeRef.current;
            size.height = element.offsetHeight || 0;
            size.width = element.offsetWidth || 0;
            size.top = element.offsetTop;
            size.left = element.offsetLeft;
        }
        return null;
    }
    /**
     * Required with getSnapshotBeforeUpdate to stop React complaining.
     */
    componentDidUpdate() { }
    render() {
        return this.props.children;
    }
}
function PopChild({ children, isPresent }) {
    const id = React.useId();
    const ref = React.useRef(null);
    const size = React.useRef({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
    });
    /**
     * We create and inject a style block so we can apply this explicit
     * sizing in a non-destructive manner by just deleting the style block.
     *
     * We can't apply size via render as the measurement happens
     * in getSnapshotBeforeUpdate (post-render), likewise if we apply the
     * styles directly on the DOM node, we might be overwriting
     * styles set via the style prop.
     */
    React.useInsertionEffect(() => {
        var _a;
        const { width, height, top, left } = size.current;
        if (isPresent || !ref.current || !width || !height)
            return;
        ref.current.dataset.motionPopId = id;
        const style = document.createElement("style");
        document.head.appendChild(style);
        (_a = style.sheet) === null || _a === void 0 ? void 0 : _a.insertRule(`
          [data-motion-pop-id="${id}"] {
            position: absolute !important;
            width: ${width}px !important;
            height: ${height}px !important;
            top: ${top}px !important;
            left: ${left}px !important;
          }
        `);
        return () => {
            document.head.removeChild(style);
        };
    }, [isPresent]);
    return (React__namespace.createElement(PopChildMeasure, { isPresent: isPresent, childRef: ref, sizeRef: size }, React__namespace.cloneElement(children, { ref })));
}

const PresenceChild = ({ children, initial, isPresent, onExitComplete, custom, presenceAffectsLayout, mode, }) => {
    const presenceChildren = useConstant(newChildrenMap);
    const id = React.useId();
    const context = React.useMemo(() => ({
        id,
        initial,
        isPresent,
        custom,
        onExitComplete: (childId) => {
            presenceChildren.set(childId, true);
            for (const isComplete of presenceChildren.values()) {
                if (!isComplete)
                    return; // can stop searching when any is incomplete
            }
            onExitComplete === null || onExitComplete === void 0 ? void 0 : onExitComplete();
        },
        register: (childId) => {
            presenceChildren.set(childId, false);
            return () => presenceChildren.delete(childId);
        },
    }), 
    /**
     * If the presence of a child affects the layout of the components around it,
     * we want to make a new context value to ensure they get re-rendered
     * so they can detect that layout change.
     */
    presenceAffectsLayout ? undefined : [isPresent]);
    React.useMemo(() => {
        presenceChildren.forEach((_, key) => presenceChildren.set(key, false));
    }, [isPresent]);
    /**
     * If there's no `motion` components to fire exit animations, we want to remove this
     * component immediately.
     */
    React__namespace.useEffect(() => {
        !isPresent && !presenceChildren.size && (onExitComplete === null || onExitComplete === void 0 ? void 0 : onExitComplete());
    }, [isPresent]);
    if (mode === "popLayout") {
        children = React__namespace.createElement(PopChild, { isPresent: isPresent }, children);
    }
    return (React__namespace.createElement(PresenceContext.Provider, { value: context }, children));
};
function newChildrenMap() {
    return new Map();
}

const getChildKey = (child) => child.key || "";
function updateChildLookup(children, allChildren) {
    children.forEach((child) => {
        const key = getChildKey(child);
        allChildren.set(key, child);
    });
}
function onlyElements(children) {
    const filtered = [];
    // We use forEach here instead of map as map mutates the component key by preprending `.$`
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child))
            filtered.push(child);
    });
    return filtered;
}
/**
 * `AnimatePresence` enables the animation of components that have been removed from the tree.
 *
 * When adding/removing more than a single child, every child **must** be given a unique `key` prop.
 *
 * Any `motion` components that have an `exit` property defined will animate out when removed from
 * the tree.
 *
 * ```jsx
 * import { motion, AnimatePresence } from 'framer-motion'
 *
 * export const Items = ({ items }) => (
 *   <AnimatePresence>
 *     {items.map(item => (
 *       <motion.div
 *         key={item.id}
 *         initial={{ opacity: 0 }}
 *         animate={{ opacity: 1 }}
 *         exit={{ opacity: 0 }}
 *       />
 *     ))}
 *   </AnimatePresence>
 * )
 * ```
 *
 * You can sequence exit animations throughout a tree using variants.
 *
 * If a child contains multiple `motion` components with `exit` props, it will only unmount the child
 * once all `motion` components have finished animating out. Likewise, any components using
 * `usePresence` all need to call `safeToRemove`.
 *
 * @public
 */
const AnimatePresence = ({ children, custom, initial = true, onExitComplete, exitBeforeEnter, presenceAffectsLayout = true, mode = "sync", }) => {
    // Support deprecated exitBeforeEnter prop
    if (exitBeforeEnter) {
        mode = "wait";
        warnOnce(false, "Replace exitBeforeEnter with mode='wait'");
    }
    // We want to force a re-render once all exiting animations have finished. We
    // either use a local forceRender function, or one from a parent context if it exists.
    let [forceRender] = useForceUpdate();
    const forceRenderLayoutGroup = React.useContext(LayoutGroupContext).forceRender;
    if (forceRenderLayoutGroup)
        forceRender = forceRenderLayoutGroup;
    const isMounted = useIsMounted();
    // Filter out any children that aren't ReactElements. We can only track ReactElements with a props.key
    const filteredChildren = onlyElements(children);
    let childrenToRender = filteredChildren;
    const exiting = new Set();
    // Keep a living record of the children we're actually rendering so we
    // can diff to figure out which are entering and exiting
    const presentChildren = React.useRef(childrenToRender);
    // A lookup table to quickly reference components by key
    const allChildren = React.useRef(new Map()).current;
    // If this is the initial component render, just deal with logic surrounding whether
    // we play onMount animations or not.
    const isInitialRender = React.useRef(true);
    useIsomorphicLayoutEffect(() => {
        isInitialRender.current = false;
        updateChildLookup(filteredChildren, allChildren);
        presentChildren.current = childrenToRender;
    });
    useUnmountEffect(() => {
        isInitialRender.current = true;
        allChildren.clear();
        exiting.clear();
    });
    if (isInitialRender.current) {
        return (React__namespace.createElement(React__namespace.Fragment, null, childrenToRender.map((child) => (React__namespace.createElement(PresenceChild, { key: getChildKey(child), isPresent: true, initial: initial ? undefined : false, presenceAffectsLayout: presenceAffectsLayout, mode: mode }, child)))));
    }
    // If this is a subsequent render, deal with entering and exiting children
    childrenToRender = [...childrenToRender];
    // Diff the keys of the currently-present and target children to update our
    // exiting list.
    const presentKeys = presentChildren.current.map(getChildKey);
    const targetKeys = filteredChildren.map(getChildKey);
    // Diff the present children with our target children and mark those that are exiting
    const numPresent = presentKeys.length;
    for (let i = 0; i < numPresent; i++) {
        const key = presentKeys[i];
        if (targetKeys.indexOf(key) === -1) {
            exiting.add(key);
        }
    }
    // If we currently have exiting children, and we're deferring rendering incoming children
    // until after all current children have exiting, empty the childrenToRender array
    if (mode === "wait" && exiting.size) {
        childrenToRender = [];
    }
    // Loop through all currently exiting components and clone them to overwrite `animate`
    // with any `exit` prop they might have defined.
    exiting.forEach((key) => {
        // If this component is actually entering again, early return
        if (targetKeys.indexOf(key) !== -1)
            return;
        const child = allChildren.get(key);
        if (!child)
            return;
        const insertionIndex = presentKeys.indexOf(key);
        const onExit = () => {
            allChildren.delete(key);
            exiting.delete(key);
            // Remove this child from the present children
            const removeIndex = presentChildren.current.findIndex((presentChild) => presentChild.key === key);
            presentChildren.current.splice(removeIndex, 1);
            // Defer re-rendering until all exiting children have indeed left
            if (!exiting.size) {
                presentChildren.current = filteredChildren;
                if (isMounted.current === false)
                    return;
                forceRender();
                onExitComplete && onExitComplete();
            }
        };
        childrenToRender.splice(insertionIndex, 0, React__namespace.createElement(PresenceChild, { key: getChildKey(child), isPresent: false, onExitComplete: onExit, custom: custom, presenceAffectsLayout: presenceAffectsLayout, mode: mode }, child));
    });
    // Add `MotionContext` even to children that don't need it to ensure we're rendering
    // the same tree between renders
    childrenToRender = childrenToRender.map((child) => {
        const key = child.key;
        return exiting.has(key) ? (child) : (React__namespace.createElement(PresenceChild, { key: getChildKey(child), isPresent: true, presenceAffectsLayout: presenceAffectsLayout, mode: mode }, child));
    });
    if (env !== "production" &&
        mode === "wait" &&
        childrenToRender.length > 1) {
        console.warn(`You're attempting to animate multiple children within AnimatePresence, but its mode is set to "wait". This will lead to odd visual behaviour.`);
    }
    return (React__namespace.createElement(React__namespace.Fragment, null, exiting.size
        ? childrenToRender
        : childrenToRender.map((child) => React.cloneElement(child))));
};

/**
 * @deprecated
 */
const DeprecatedLayoutGroupContext = React.createContext(null);

const notify = (node) => !node.isLayoutDirty && node.willUpdate(false);
function nodeGroup() {
    const nodes = new Set();
    const subscriptions = new WeakMap();
    const dirtyAll = () => nodes.forEach(notify);
    return {
        add: (node) => {
            nodes.add(node);
            subscriptions.set(node, node.addEventListener("willUpdate", dirtyAll));
        },
        remove: (node) => {
            var _a;
            nodes.delete(node);
            (_a = subscriptions.get(node)) === null || _a === void 0 ? void 0 : _a();
            subscriptions.delete(node);
            dirtyAll();
        },
        dirty: dirtyAll,
    };
}

const shouldInheritGroup = (inherit) => inherit === true;
const shouldInheritId = (inherit) => shouldInheritGroup(inherit === true) || inherit === "id";
const LayoutGroup = ({ children, id, inheritId, inherit = true, }) => {
    var _a, _b;
    // Maintain backwards-compatibility with inheritId until 7.0
    if (inheritId !== undefined)
        inherit = inheritId;
    const layoutGroupContext = React.useContext(LayoutGroupContext);
    const deprecatedLayoutGroupContext = React.useContext(DeprecatedLayoutGroupContext);
    const [forceRender, key] = useForceUpdate();
    const context = React.useRef(null);
    const upstreamId = (_a = layoutGroupContext.id) !== null && _a !== void 0 ? _a : deprecatedLayoutGroupContext;
    if (context.current === null) {
        if (shouldInheritId(inherit) && upstreamId) {
            id = id ? upstreamId + "-" + id : upstreamId;
        }
        context.current = {
            id,
            group: shouldInheritGroup(inherit)
                ? (_b = layoutGroupContext === null || layoutGroupContext === void 0 ? void 0 : layoutGroupContext.group) !== null && _b !== void 0 ? _b : nodeGroup()
                : nodeGroup(),
        };
    }
    const memoizedContext = React.useMemo(() => (Object.assign(Object.assign({}, context.current), { forceRender })), [key]);
    return (React__namespace.createElement(LayoutGroupContext.Provider, { value: memoizedContext }, children));
};

let id = 0;
const AnimateSharedLayout = ({ children, }) => {
    React__namespace.useEffect(() => {
        heyListen.warning(false, "AnimateSharedLayout is deprecated: https://www.framer.com/docs/guide-upgrade/##shared-layout-animations");
    }, []);
    return (React__namespace.createElement(LayoutGroup, { id: useConstant(() => `asl-${id++}`) }, children));
};

/**
 * `MotionConfig` is used to set configuration options for all children `motion` components.
 *
 * ```jsx
 * import { motion, MotionConfig } from "framer-motion"
 *
 * export function App() {
 *   return (
 *     <MotionConfig transition={{ type: "spring" }}>
 *       <motion.div animate={{ x: 100 }} />
 *     </MotionConfig>
 *   )
 * }
 * ```
 *
 * @public
 */
function MotionConfig(_a) {
    var { children, isValidProp } = _a, config = tslib.__rest(_a, ["children", "isValidProp"]);
    isValidProp && loadExternalIsValidProp(isValidProp);
    /**
     * Inherit props from any parent MotionConfig components
     */
    config = Object.assign(Object.assign({}, React.useContext(MotionConfigContext)), config);
    /**
     * Don't allow isStatic to change between renders as it affects how many hooks
     * motion components fire.
     */
    config.isStatic = useConstant(() => config.isStatic);
    /**
     * Creating a new config context object will re-render every `motion` component
     * every time it renders. So we only want to create a new one sparingly.
     */
    const context = React.useMemo(() => config, [JSON.stringify(config.transition), config.transformPagePoint, config.reducedMotion]);
    return (React__namespace.createElement(MotionConfigContext.Provider, { value: context }, children));
}

/**
 * Used in conjunction with the `m` component to reduce bundle size.
 *
 * `m` is a version of the `motion` component that only loads functionality
 * critical for the initial render.
 *
 * `LazyMotion` can then be used to either synchronously or asynchronously
 * load animation and gesture support.
 *
 * ```jsx
 * // Synchronous loading
 * import { LazyMotion, m, domAnimations } from "framer-motion"
 *
 * function App() {
 *   return (
 *     <LazyMotion features={domAnimations}>
 *       <m.div animate={{ scale: 2 }} />
 *     </LazyMotion>
 *   )
 * }
 *
 * // Asynchronous loading
 * import { LazyMotion, m } from "framer-motion"
 *
 * function App() {
 *   return (
 *     <LazyMotion features={() => import('./path/to/domAnimations')}>
 *       <m.div animate={{ scale: 2 }} />
 *     </LazyMotion>
 *   )
 * }
 * ```
 *
 * @public
 */
function LazyMotion({ children, features, strict = false }) {
    const [, setIsLoaded] = React.useState(!isLazyBundle(features));
    const loadedRenderer = React.useRef(undefined);
    /**
     * If this is a synchronous load, load features immediately
     */
    if (!isLazyBundle(features)) {
        const { renderer } = features, loadedFeatures = tslib.__rest(features, ["renderer"]);
        loadedRenderer.current = renderer;
        loadFeatures(loadedFeatures);
    }
    React.useEffect(() => {
        if (isLazyBundle(features)) {
            features().then((_a) => {
                var { renderer } = _a, loadedFeatures = tslib.__rest(_a, ["renderer"]);
                loadFeatures(loadedFeatures);
                loadedRenderer.current = renderer;
                setIsLoaded(true);
            });
        }
    }, []);
    return (React__namespace.createElement(LazyContext.Provider, { value: { renderer: loadedRenderer.current, strict } }, children));
}
function isLazyBundle(features) {
    return typeof features === "function";
}

const ReorderContext = React.createContext(null);

function checkReorder(order, value, offset, velocity) {
    if (!velocity)
        return order;
    const index = order.findIndex((item) => item.value === value);
    if (index === -1)
        return order;
    const nextOffset = velocity > 0 ? 1 : -1;
    const nextItem = order[index + nextOffset];
    if (!nextItem)
        return order;
    const item = order[index];
    const nextLayout = nextItem.layout;
    const nextItemCenter = popmotion.mix(nextLayout.min, nextLayout.max, 0.5);
    if ((nextOffset === 1 && item.layout.max + offset > nextItemCenter) ||
        (nextOffset === -1 && item.layout.min + offset < nextItemCenter)) {
        return moveItem(order, index, index + nextOffset);
    }
    return order;
}

function ReorderGroup(_a, externalRef) {
    var { children, as = "ul", axis = "y", onReorder, values } = _a, props = tslib.__rest(_a, ["children", "as", "axis", "onReorder", "values"]);
    const Component = useConstant(() => motion(as));
    const order = [];
    const isReordering = React.useRef(false);
    heyListen.invariant(Boolean(values), "Reorder.Group must be provided a values prop");
    const context = {
        axis,
        registerItem: (value, layout) => {
            /**
             * Ensure entries can't add themselves more than once
             */
            if (layout &&
                order.findIndex((entry) => value === entry.value) === -1) {
                order.push({ value, layout: layout[axis] });
                order.sort(compareMin);
            }
        },
        updateOrder: (id, offset, velocity) => {
            if (isReordering.current)
                return;
            const newOrder = checkReorder(order, id, offset, velocity);
            if (order !== newOrder) {
                isReordering.current = true;
                onReorder(newOrder
                    .map(getValue)
                    .filter((value) => values.indexOf(value) !== -1));
            }
        },
    };
    React.useEffect(() => {
        isReordering.current = false;
    });
    return (React__namespace.createElement(Component, Object.assign({}, props, { ref: externalRef }),
        React__namespace.createElement(ReorderContext.Provider, { value: context }, children)));
}
const Group = React.forwardRef(ReorderGroup);
function getValue(item) {
    return item.value;
}
function compareMin(a, b) {
    return a.layout.min - b.layout.min;
}

/**
 * Creates a `MotionValue` to track the state and velocity of a value.
 *
 * Usually, these are created automatically. For advanced use-cases, like use with `useTransform`, you can create `MotionValue`s externally and pass them into the animated component via the `style` prop.
 *
 * ```jsx
 * export const MyComponent = () => {
 *   const scale = useMotionValue(1)
 *
 *   return <motion.div style={{ scale }} />
 * }
 * ```
 *
 * @param initial - The initial state.
 *
 * @public
 */
function useMotionValue(initial) {
    const value = useConstant(() => motionValue(initial));
    /**
     * If this motion value is being used in static mode, like on
     * the Framer canvas, force components to rerender when the motion
     * value is updated.
     */
    const { isStatic } = React.useContext(MotionConfigContext);
    if (isStatic) {
        const [, setLatest] = React.useState(initial);
        React.useEffect(() => value.onChange(setLatest), []);
    }
    return value;
}

const isCustomValueType = (v) => {
    return typeof v === "object" && v.mix;
};
const getMixer = (v) => (isCustomValueType(v) ? v.mix : undefined);
function transform(...args) {
    const useImmediate = !Array.isArray(args[0]);
    const argOffset = useImmediate ? 0 : -1;
    const inputValue = args[0 + argOffset];
    const inputRange = args[1 + argOffset];
    const outputRange = args[2 + argOffset];
    const options = args[3 + argOffset];
    const interpolator = popmotion.interpolate(inputRange, outputRange, Object.assign({ mixer: getMixer(outputRange[0]) }, options));
    return useImmediate ? interpolator(inputValue) : interpolator;
}

function useOnChange(value, callback) {
    useIsomorphicLayoutEffect(() => {
        if (isMotionValue(value))
            return value.onChange(callback);
    }, [callback]);
}
function useMultiOnChange(values, handler) {
    useIsomorphicLayoutEffect(() => {
        const subscriptions = values.map((value) => value.onChange(handler));
        return () => subscriptions.forEach((unsubscribe) => unsubscribe());
    });
}

function useCombineMotionValues(values, combineValues) {
    /**
     * Initialise the returned motion value. This remains the same between renders.
     */
    const value = useMotionValue(combineValues());
    /**
     * Create a function that will update the template motion value with the latest values.
     * This is pre-bound so whenever a motion value updates it can schedule its
     * execution in Framesync. If it's already been scheduled it won't be fired twice
     * in a single frame.
     */
    const updateValue = () => value.set(combineValues());
    /**
     * Synchronously update the motion value with the latest values during the render.
     * This ensures that within a React render, the styles applied to the DOM are up-to-date.
     */
    updateValue();
    /**
     * Subscribe to all motion values found within the template. Whenever any of them change,
     * schedule an update.
     */
    useMultiOnChange(values, () => sync__default["default"].update(updateValue, false, true));
    return value;
}

function useTransform(input, inputRangeOrTransformer, outputRange, options) {
    const transformer = typeof inputRangeOrTransformer === "function"
        ? inputRangeOrTransformer
        : transform(inputRangeOrTransformer, outputRange, options);
    return Array.isArray(input)
        ? useListTransform(input, transformer)
        : useListTransform([input], ([latest]) => transformer(latest));
}
function useListTransform(values, transformer) {
    const latest = useConstant(() => []);
    return useCombineMotionValues(values, () => {
        latest.length = 0;
        const numValues = values.length;
        for (let i = 0; i < numValues; i++) {
            latest[i] = values[i].get();
        }
        return transformer(latest);
    });
}

function useDefaultMotionValue(value, defaultValue = 0) {
    return isMotionValue(value) ? value : useMotionValue(defaultValue);
}
function ReorderItem(_a, externalRef) {
    var { children, style, value, as = "li", onDrag, layout = true } = _a, props = tslib.__rest(_a, ["children", "style", "value", "as", "onDrag", "layout"]);
    const Component = useConstant(() => motion(as));
    const context = React.useContext(ReorderContext);
    const point = {
        x: useDefaultMotionValue(style === null || style === void 0 ? void 0 : style.x),
        y: useDefaultMotionValue(style === null || style === void 0 ? void 0 : style.y),
    };
    const zIndex = useTransform([point.x, point.y], ([latestX, latestY]) => latestX || latestY ? 1 : "unset");
    const measuredLayout = React.useRef(null);
    heyListen.invariant(Boolean(context), "Reorder.Item must be a child of Reorder.Group");
    const { axis, registerItem, updateOrder } = context;
    React.useEffect(() => {
        registerItem(value, measuredLayout.current);
    }, [context]);
    return (React__namespace.createElement(Component, Object.assign({ drag: axis }, props, { dragSnapToOrigin: true, style: Object.assign(Object.assign({}, style), { x: point.x, y: point.y, zIndex }), layout: layout, onDrag: (event, gesturePoint) => {
            const { velocity } = gesturePoint;
            velocity[axis] &&
                updateOrder(value, point[axis].get(), velocity[axis]);
            onDrag === null || onDrag === void 0 ? void 0 : onDrag(event, gesturePoint);
        }, onLayoutMeasure: (measured) => {
            measuredLayout.current = measured;
        }, ref: externalRef }), children));
}
const Item = React.forwardRef(ReorderItem);

const Reorder = {
    Group,
    Item,
};

/**
 * @public
 */
const domAnimation = Object.assign(Object.assign({ renderer: createDomVisualElement }, animations), gestureAnimations);

/**
 * @public
 */
const domMax = Object.assign(Object.assign(Object.assign(Object.assign({}, domAnimation), drag), layoutFeatures), { projectionNodeConstructor: HTMLProjectionNode });

/**
 * Combine multiple motion values into a new one using a string template literal.
 *
 * ```jsx
 * import {
 *   motion,
 *   useSpring,
 *   useMotionValue,
 *   useMotionTemplate
 * } from "framer-motion"
 *
 * function Component() {
 *   const shadowX = useSpring(0)
 *   const shadowY = useMotionValue(0)
 *   const shadow = useMotionTemplate`drop-shadow(${shadowX}px ${shadowY}px 20px rgba(0,0,0,0.3))`
 *
 *   return <motion.div style={{ filter: shadow }} />
 * }
 * ```
 *
 * @public
 */
function useMotionTemplate(fragments, ...values) {
    /**
     * Create a function that will build a string from the latest motion values.
     */
    const numFragments = fragments.length;
    function buildValue() {
        let output = ``;
        for (let i = 0; i < numFragments; i++) {
            output += fragments[i];
            const value = values[i];
            if (value)
                output += values[i].get();
        }
        return output;
    }
    return useCombineMotionValues(values, buildValue);
}

/**
 * Creates a `MotionValue` that, when `set`, will use a spring animation to animate to its new state.
 *
 * It can either work as a stand-alone `MotionValue` by initialising it with a value, or as a subscriber
 * to another `MotionValue`.
 *
 * @remarks
 *
 * ```jsx
 * const x = useSpring(0, { stiffness: 300 })
 * const y = useSpring(x, { damping: 10 })
 * ```
 *
 * @param inputValue - `MotionValue` or number. If provided a `MotionValue`, when the input `MotionValue` changes, the created `MotionValue` will spring towards that value.
 * @param springConfig - Configuration options for the spring.
 * @returns `MotionValue`
 *
 * @public
 */
function useSpring(source, config = {}) {
    const { isStatic } = React.useContext(MotionConfigContext);
    const activeSpringAnimation = React.useRef(null);
    const value = useMotionValue(isMotionValue(source) ? source.get() : source);
    React.useMemo(() => {
        return value.attach((v, set) => {
            /**
             * A more hollistic approach to this might be to use isStatic to fix VisualElement animations
             * at that level, but this will work for now
             */
            if (isStatic)
                return set(v);
            if (activeSpringAnimation.current) {
                activeSpringAnimation.current.stop();
            }
            activeSpringAnimation.current = popmotion.animate(Object.assign(Object.assign({ from: value.get(), to: v, velocity: value.getVelocity() }, config), { onUpdate: set }));
            return value.get();
        });
    }, [JSON.stringify(config)]);
    useOnChange(source, (v) => value.set(parseFloat(v)));
    return value;
}

/**
 * Creates a `MotionValue` that updates when the velocity of the provided `MotionValue` changes.
 *
 * ```javascript
 * const x = useMotionValue(0)
 * const xVelocity = useVelocity(x)
 * const xAcceleration = useVelocity(xVelocity)
 * ```
 *
 * @public
 */
function useVelocity(value) {
    const velocity = useMotionValue(value.getVelocity());
    React.useEffect(() => {
        return value.velocityUpdateSubscribers.add((newVelocity) => {
            velocity.set(newVelocity);
        });
    }, [value]);
    return velocity;
}

const createScrollMotionValues = () => ({
    scrollX: motionValue(0),
    scrollY: motionValue(0),
    scrollXProgress: motionValue(0),
    scrollYProgress: motionValue(0),
});
function useScroll(_a = {}) {
    var { container, target } = _a, options = tslib.__rest(_a, ["container", "target"]);
    const values = useConstant(createScrollMotionValues);
    useIsomorphicLayoutEffect(() => {
        return dom.scroll(({ x, y }) => {
            values.scrollX.set(x.current);
            values.scrollXProgress.set(x.progress);
            values.scrollY.set(y.current);
            values.scrollYProgress.set(y.progress);
        }, Object.assign(Object.assign({}, options), { container: (container === null || container === void 0 ? void 0 : container.current) || undefined, target: (target === null || target === void 0 ? void 0 : target.current) || undefined }));
    }, []);
    return values;
}

/**
 * @deprecated useElementScroll is deprecated. Convert to useScroll({ container: ref })
 */
function useElementScroll(ref) {
    warnOnce(false, "useElementScroll is deprecated. Convert to useScroll({ container: ref }).");
    return useScroll({ container: ref });
}

/**
 * @deprecated useViewportScroll is deprecated. Convert to useScroll()
 */
function useViewportScroll() {
    warnOnce(false, "useViewportScroll is deprecated. Convert to useScroll().");
    return useScroll();
}

function useAnimationFrame(callback) {
    const initialTimestamp = React.useRef(0);
    const { isStatic } = React.useContext(MotionConfigContext);
    React.useEffect(() => {
        if (isStatic)
            return;
        const provideTimeSinceStart = ({ timestamp }) => {
            if (!initialTimestamp.current)
                initialTimestamp.current = timestamp;
            callback(timestamp - initialTimestamp.current);
        };
        sync__default["default"].update(provideTimeSinceStart, true);
        return () => sync.cancelSync.update(provideTimeSinceStart);
    }, [callback]);
}

function useTime() {
    const time = useMotionValue(0);
    useAnimationFrame((t) => time.set(t));
    return time;
}

class WillChangeMotionValue extends MotionValue {
    constructor() {
        super(...arguments);
        this.members = [];
        this.transforms = new Set();
    }
    add(name) {
        let memberName;
        if (isTransformProp(name)) {
            this.transforms.add(name);
            memberName = "transform";
        }
        else if (!isTransformOriginProp(name) &&
            !isCSSVariable$1(name) &&
            name !== "willChange") {
            memberName = camelToDash(name);
        }
        if (memberName) {
            addUniqueItem(this.members, memberName);
            this.update();
        }
    }
    remove(name) {
        if (isTransformProp(name)) {
            this.transforms.delete(name);
            if (!this.transforms.size) {
                removeItem(this.members, "transform");
            }
        }
        else {
            removeItem(this.members, camelToDash(name));
        }
        this.update();
    }
    update() {
        this.set(this.members.length ? this.members.join(", ") : "auto");
    }
}
function useWillChange() {
    return useConstant(() => new WillChangeMotionValue("auto"));
}

/**
 * @public
 */
function animationControls() {
    /**
     * Track whether the host component has mounted.
     */
    let hasMounted = false;
    /**
     * Pending animations that are started before a component is mounted.
     * TODO: Remove this as animations should only run in effects
     */
    const pendingAnimations = [];
    /**
     * A collection of linked component animation controls.
     */
    const subscribers = new Set();
    const controls = {
        subscribe(visualElement) {
            subscribers.add(visualElement);
            return () => void subscribers.delete(visualElement);
        },
        start(definition, transitionOverride) {
            /**
             * TODO: We only perform this hasMounted check because in Framer we used to
             * encourage the ability to start an animation within the render phase. This
             * isn't behaviour concurrent-safe so when we make Framer concurrent-safe
             * we can ditch this.
             */
            if (hasMounted) {
                const animations = [];
                subscribers.forEach((visualElement) => {
                    animations.push(animateVisualElement(visualElement, definition, {
                        transitionOverride,
                    }));
                });
                return Promise.all(animations);
            }
            else {
                return new Promise((resolve) => {
                    pendingAnimations.push({
                        animation: [definition, transitionOverride],
                        resolve,
                    });
                });
            }
        },
        set(definition) {
            heyListen.invariant(hasMounted, "controls.set() should only be called after a component has mounted. Consider calling within a useEffect hook.");
            return subscribers.forEach((visualElement) => {
                setValues(visualElement, definition);
            });
        },
        stop() {
            subscribers.forEach((visualElement) => {
                stopAnimation(visualElement);
            });
        },
        mount() {
            hasMounted = true;
            pendingAnimations.forEach(({ animation, resolve }) => {
                controls.start(...animation).then(resolve);
            });
            return () => {
                hasMounted = false;
                controls.stop();
            };
        },
    };
    return controls;
}

/**
 * Creates `AnimationControls`, which can be used to manually start, stop
 * and sequence animations on one or more components.
 *
 * The returned `AnimationControls` should be passed to the `animate` property
 * of the components you want to animate.
 *
 * These components can then be animated with the `start` method.
 *
 * ```jsx
 * import * as React from 'react'
 * import { motion, useAnimation } from 'framer-motion'
 *
 * export function MyComponent(props) {
 *    const controls = useAnimation()
 *
 *    controls.start({
 *        x: 100,
 *        transition: { duration: 0.5 },
 *    })
 *
 *    return <motion.div animate={controls} />
 * }
 * ```
 *
 * @returns Animation controller with `start` and `stop` methods
 *
 * @public
 */
function useAnimationControls() {
    const controls = useConstant(animationControls);
    React.useEffect(controls.mount, []);
    return controls;
}
const useAnimation = useAnimationControls;

/**
 * Cycles through a series of visual properties. Can be used to toggle between or cycle through animations. It works similar to `useState` in React. It is provided an initial array of possible states, and returns an array of two arguments.
 *
 * An index value can be passed to the returned `cycle` function to cycle to a specific index.
 *
 * ```jsx
 * import * as React from "react"
 * import { motion, useCycle } from "framer-motion"
 *
 * export const MyComponent = () => {
 *   const [x, cycleX] = useCycle(0, 50, 100)
 *
 *   return (
 *     <motion.div
 *       animate={{ x: x }}
 *       onTap={() => cycleX()}
 *      />
 *    )
 * }
 * ```
 *
 * @param items - items to cycle through
 * @returns [currentState, cycleState]
 *
 * @public
 */
function useCycle(...items) {
    const index = React.useRef(0);
    const [item, setItem] = React.useState(items[index.current]);
    const runCycle = React.useCallback((next) => {
        index.current =
            typeof next !== "number"
                ? popmotion.wrap(0, items.length, index.current + 1)
                : next;
        setItem(items[index.current]);
    }, 
    // The array will change on each call, but by putting items.length at
    // the front of this array, we guarantee the dependency comparison will match up
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.length, ...items]);
    return [item, runCycle];
}

function useInView(ref, { root, margin, amount, once = false } = {}) {
    const [isInView, setInView] = React.useState(false);
    React.useEffect(() => {
        var _a;
        if (!ref.current || (once && isInView))
            return;
        const onEnter = () => {
            setInView(true);
            return once ? undefined : () => setInView(false);
        };
        const options = {
            root: (_a = root === null || root === void 0 ? void 0 : root.current) !== null && _a !== void 0 ? _a : undefined,
            margin,
            amount: amount === "some" ? "any" : amount,
        };
        return dom.inView(ref.current, onEnter, options);
    }, [root, ref, margin, once]);
    return isInView;
}

/**
 * Can manually trigger a drag gesture on one or more `drag`-enabled `motion` components.
 *
 * ```jsx
 * const dragControls = useDragControls()
 *
 * function startDrag(event) {
 *   dragControls.start(event, { snapToCursor: true })
 * }
 *
 * return (
 *   <>
 *     <div onPointerDown={startDrag} />
 *     <motion.div drag="x" dragControls={dragControls} />
 *   </>
 * )
 * ```
 *
 * @public
 */
class DragControls {
    constructor() {
        this.componentControls = new Set();
    }
    /**
     * Subscribe a component's internal `VisualElementDragControls` to the user-facing API.
     *
     * @internal
     */
    subscribe(controls) {
        this.componentControls.add(controls);
        return () => this.componentControls.delete(controls);
    }
    /**
     * Start a drag gesture on every `motion` component that has this set of drag controls
     * passed into it via the `dragControls` prop.
     *
     * ```jsx
     * dragControls.start(e, {
     *   snapToCursor: true
     * })
     * ```
     *
     * @param event - PointerEvent
     * @param options - Options
     *
     * @public
     */
    start(event, options) {
        this.componentControls.forEach((controls) => {
            controls.start(event.nativeEvent || event, options);
        });
    }
}
const createDragControls = () => new DragControls();
/**
 * Usually, dragging is initiated by pressing down on a `motion` component with a `drag` prop
 * and moving it. For some use-cases, for instance clicking at an arbitrary point on a video scrubber, we
 * might want to initiate that dragging from a different component than the draggable one.
 *
 * By creating a `dragControls` using the `useDragControls` hook, we can pass this into
 * the draggable component's `dragControls` prop. It exposes a `start` method
 * that can start dragging from pointer events on other components.
 *
 * ```jsx
 * const dragControls = useDragControls()
 *
 * function startDrag(event) {
 *   dragControls.start(event, { snapToCursor: true })
 * }
 *
 * return (
 *   <>
 *     <div onPointerDown={startDrag} />
 *     <motion.div drag="x" dragControls={dragControls} />
 *   </>
 * )
 * ```
 *
 * @public
 */
function useDragControls() {
    return useConstant(createDragControls);
}

function useInstantLayoutTransition() {
    return startTransition;
}
function startTransition(cb) {
    if (!rootProjectionNode.current)
        return;
    rootProjectionNode.current.isUpdating = false;
    rootProjectionNode.current.blockUpdate();
    cb === null || cb === void 0 ? void 0 : cb();
}

function useInstantTransition() {
    const [forceUpdate, forcedRenderCount] = useForceUpdate();
    const startInstantLayoutTransition = useInstantLayoutTransition();
    React.useEffect(() => {
        /**
         * Unblock after two animation frames, otherwise this will unblock too soon.
         */
        sync__default["default"].postRender(() => sync__default["default"].postRender(() => (instantAnimationState.current = false)));
    }, [forcedRenderCount]);
    return (callback) => {
        startInstantLayoutTransition(() => {
            instantAnimationState.current = true;
            forceUpdate();
            callback();
        });
    };
}

function useResetProjection() {
    const reset = React__namespace.useCallback(() => {
        const root = rootProjectionNode.current;
        if (!root)
            return;
        root.resetTree();
    }, []);
    return reset;
}

const createObject = () => ({});
const stateVisualElement = visualElement({
    build() { },
    measureViewportBox: createBox,
    resetTransform() { },
    restoreTransform() { },
    removeValueFromRenderState() { },
    render() { },
    scrapeMotionValuesFromProps: createObject,
    readValueFromInstance(_state, key, options) {
        return options.initialState[key] || 0;
    },
    makeTargetAnimatable(element, _a) {
        var { transition, transitionEnd } = _a, target = tslib.__rest(_a, ["transition", "transitionEnd"]);
        const origin = getOrigin(target, transition || {}, element);
        checkTargetForNewValues(element, target, origin);
        return Object.assign({ transition, transitionEnd }, target);
    },
});
const useVisualState = makeUseVisualState({
    scrapeMotionValuesFromProps: createObject,
    createRenderState: createObject,
});
/**
 * This is not an officially supported API and may be removed
 * on any version.
 */
function useAnimatedState(initialState) {
    const [animationState, setAnimationState] = React.useState(initialState);
    const visualState = useVisualState({}, false);
    const element = useConstant(() => stateVisualElement({ props: {}, visualState }, { initialState }));
    React.useEffect(() => {
        element.mount({});
        return element.unmount;
    }, [element]);
    React.useEffect(() => {
        element.setProps({
            onUpdate: (v) => {
                setAnimationState(Object.assign({}, v));
            },
        });
    }, [setAnimationState, element]);
    const startAnimation = useConstant(() => (animationDefinition) => {
        return animateVisualElement(element, animationDefinition);
    });
    return [animationState, startAnimation];
}

// Keep things reasonable and avoid scale: Infinity. In practise we might need
// to add another value, opacity, that could interpolate scaleX/Y [0,0.01] => [0,1]
// to simply hide content at unreasonable scales.
const maxScale = 100000;
const invertScale = (scale) => scale > 0.001 ? 1 / scale : maxScale;
let hasWarned = false;
/**
 * Returns a `MotionValue` each for `scaleX` and `scaleY` that update with the inverse
 * of their respective parent scales.
 *
 * This is useful for undoing the distortion of content when scaling a parent component.
 *
 * By default, `useInvertedScale` will automatically fetch `scaleX` and `scaleY` from the nearest parent.
 * By passing other `MotionValue`s in as `useInvertedScale({ scaleX, scaleY })`, it will invert the output
 * of those instead.
 *
 * ```jsx
 * const MyComponent = () => {
 *   const { scaleX, scaleY } = useInvertedScale()
 *   return <motion.div style={{ scaleX, scaleY }} />
 * }
 * ```
 *
 * @deprecated
 */
function useInvertedScale(scale) {
    let parentScaleX = useMotionValue(1);
    let parentScaleY = useMotionValue(1);
    const visualElement = useVisualElementContext();
    heyListen.invariant(!!(scale || visualElement), "If no scale values are provided, useInvertedScale must be used within a child of another motion component.");
    heyListen.warning(hasWarned, "useInvertedScale is deprecated and will be removed in 3.0. Use the layout prop instead.");
    hasWarned = true;
    if (scale) {
        parentScaleX = scale.scaleX || parentScaleX;
        parentScaleY = scale.scaleY || parentScaleY;
    }
    else if (visualElement) {
        parentScaleX = visualElement.getValue("scaleX", 1);
        parentScaleY = visualElement.getValue("scaleY", 1);
    }
    const scaleX = useTransform(parentScaleX, invertScale);
    const scaleY = useTransform(parentScaleY, invertScale);
    return { scaleX, scaleY };
}

exports.AnimatePresence = AnimatePresence;
exports.AnimateSharedLayout = AnimateSharedLayout;
exports.DeprecatedLayoutGroupContext = DeprecatedLayoutGroupContext;
exports.DragControls = DragControls;
exports.FlatTree = FlatTree;
exports.LayoutGroup = LayoutGroup;
exports.LayoutGroupContext = LayoutGroupContext;
exports.LazyMotion = LazyMotion;
exports.MotionConfig = MotionConfig;
exports.MotionConfigContext = MotionConfigContext;
exports.MotionContext = MotionContext;
exports.MotionValue = MotionValue;
exports.PresenceContext = PresenceContext;
exports.Reorder = Reorder;
exports.SwitchLayoutGroupContext = SwitchLayoutGroupContext;
exports.addPointerEvent = addPointerEvent;
exports.addScaleCorrector = addScaleCorrector;
exports.animate = animate;
exports.animateVisualElement = animateVisualElement;
exports.animationControls = animationControls;
exports.animations = animations;
exports.calcLength = calcLength;
exports.checkTargetForNewValues = checkTargetForNewValues;
exports.createBox = createBox;
exports.createDomMotionComponent = createDomMotionComponent;
exports.createMotionComponent = createMotionComponent;
exports.domAnimation = domAnimation;
exports.domMax = domMax;
exports.filterProps = filterProps;
exports.isBrowser = isBrowser;
exports.isDragActive = isDragActive;
exports.isMotionValue = isMotionValue;
exports.isValidMotionProp = isValidMotionProp;
exports.m = m;
exports.makeUseVisualState = makeUseVisualState;
exports.motion = motion;
exports.motionValue = motionValue;
exports.resolveMotionValue = resolveMotionValue;
exports.transform = transform;
exports.useAnimation = useAnimation;
exports.useAnimationControls = useAnimationControls;
exports.useAnimationFrame = useAnimationFrame;
exports.useCycle = useCycle;
exports.useDeprecatedAnimatedState = useAnimatedState;
exports.useDeprecatedInvertedScale = useInvertedScale;
exports.useDomEvent = useDomEvent;
exports.useDragControls = useDragControls;
exports.useElementScroll = useElementScroll;
exports.useForceUpdate = useForceUpdate;
exports.useInView = useInView;
exports.useInstantLayoutTransition = useInstantLayoutTransition;
exports.useInstantTransition = useInstantTransition;
exports.useIsPresent = useIsPresent;
exports.useIsomorphicLayoutEffect = useIsomorphicLayoutEffect;
exports.useMotionTemplate = useMotionTemplate;
exports.useMotionValue = useMotionValue;
exports.usePresence = usePresence;
exports.useReducedMotion = useReducedMotion;
exports.useReducedMotionConfig = useReducedMotionConfig;
exports.useResetProjection = useResetProjection;
exports.useScroll = useScroll;
exports.useSpring = useSpring;
exports.useTime = useTime;
exports.useTransform = useTransform;
exports.useUnmountEffect = useUnmountEffect;
exports.useVelocity = useVelocity;
exports.useViewportScroll = useViewportScroll;
exports.useVisualElementContext = useVisualElementContext;
exports.useWillChange = useWillChange;
exports.visualElement = visualElement;
exports.wrapHandler = wrapHandler;
