import React from "react";

type AnyProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
} & Record<string, any>;

function makeElement(tag: keyof JSX.IntrinsicElements) {
  return ({ children, style, className, ...rest }: AnyProps) => {
    // Strip common framer-motion props that should not be passed to DOM elements
    const {
      layoutId,
      initial,
      animate,
      exit,
      transition,
      layout,
      variants,
      whileHover,
      whileTap,
      whileFocus,
      whileDrag,
      ...domProps
    } = rest as any;

    return React.createElement(
      tag,
      { style, className, ...domProps },
      children
    );
  };
}

const motionCache = new Map<string | symbol, React.FC<AnyProps>>();

export const motion = new Proxy(
  {},
  {
    get(_, prop: string | symbol) {
      // Cache created element wrappers so the returned component identity is stable
      if (motionCache.has(prop)) return motionCache.get(prop) as any;
      const comp = makeElement(prop as unknown as keyof JSX.IntrinsicElements);
      motionCache.set(prop, comp as any);
      return comp;
    },
  }
);

export const AnimatePresence: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};

export default motion;
