import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Static route tests resolve async server views before the DOM renderer. This
// checks their output without pretending to provide a browser or Next runtime.
async function resolve(node: ReactNode): Promise<ReactNode> {
  if (!isValidElement(node)) return node;
  if (
    typeof node.type === "function" &&
    node.type.constructor.name === "AsyncFunction"
  ) {
    const component = node.type as (props: unknown) => Promise<ReactNode>;
    return resolve(await component(node.props));
  }
  const element = node as ReactElement<{ children?: ReactNode }>;
  const children = await Promise.all(
    Children.toArray(element.props.children).map(resolve),
  );
  return cloneElement(element, {}, ...children);
}

export async function renderAsyncServerComponents(node: ReactNode) {
  return renderToStaticMarkup(await resolve(node));
}
