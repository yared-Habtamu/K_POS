import React from "react";

type AnyProps = React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode } & Record<string, any>;

function makeElement(tag: keyof JSX.IntrinsicElements) {
  return ({ children, style, className, ...rest }: AnyProps) => (
    React.createElement(tag, { style, className, ...rest }, children)
  );
}

export const motion = new Proxy(
  {},
  {
    get(_, prop: string) {
      // return a simple element wrapper for motion.* usage (e.g., motion.div)
      return makeElement((prop as unknown) as keyof JSX.IntrinsicElements);
    },
  }
);

export const AnimatePresence: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export default motion;
