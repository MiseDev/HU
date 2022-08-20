import { warning } from 'hey-listen';
import * as React from 'react';
import { useConstant } from '../utils/use-constant.mjs';
import { LayoutGroup } from './LayoutGroup/index.mjs';

let id = 0;
const AnimateSharedLayout = ({ children, }) => {
    React.useEffect(() => {
        warning(false, "AnimateSharedLayout is deprecated: https://www.framer.com/docs/guide-upgrade/##shared-layout-animations");
    }, []);
    return (React.createElement(LayoutGroup, { id: useConstant(() => `asl-${id++}`) }, children));
};

export { AnimateSharedLayout };
