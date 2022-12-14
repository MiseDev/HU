import { __rest } from 'tslib';
import { invariant } from 'hey-listen';
import * as React from 'react';
import { forwardRef, useRef, useEffect } from 'react';
import { ReorderContext } from '../../context/ReorderContext.mjs';
import { motion } from '../../render/dom/motion.mjs';
import { useConstant } from '../../utils/use-constant.mjs';
import { checkReorder } from './utils/check-reorder.mjs';

function ReorderGroup(_a, externalRef) {
    var { children, as = "ul", axis = "y", onReorder, values } = _a, props = __rest(_a, ["children", "as", "axis", "onReorder", "values"]);
    const Component = useConstant(() => motion(as));
    const order = [];
    const isReordering = useRef(false);
    invariant(Boolean(values), "Reorder.Group must be provided a values prop");
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
    useEffect(() => {
        isReordering.current = false;
    });
    return (React.createElement(Component, Object.assign({}, props, { ref: externalRef }),
        React.createElement(ReorderContext.Provider, { value: context }, children)));
}
const Group = forwardRef(ReorderGroup);
function getValue(item) {
    return item.value;
}
function compareMin(a, b) {
    return a.layout.min - b.layout.min;
}

export { Group, ReorderGroup };
