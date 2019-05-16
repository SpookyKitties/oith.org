import { queryARubyParents } from './dom';

export function copyAttributes(from: Element, to: Element): void {
  Array.from(from.attributes).map(
    (attr): void => {
      if (attr && to.hasAttribute && !to.hasAttribute(attr.name)) {
        if (attr.name === 'href' && !attr.value.startsWith('#')) {
          to.setAttribute(attr.name.replace('href', 'href'), attr.value);
        } else {
          {
            to.setAttribute(attr.name.replace('href', 'ref'), attr.value);
          }
        }
      }
    },
  );
}

export function queryParents(element: Element, selector: string): Element[] {
  return Array.from(element.querySelectorAll(selector))
    .map(
      (child): Element | null => {
        return child.parentElement;
      },
    )
    .filter(
      (result): boolean => {
        return result !== null;
      },
    ) as Element[];
}

export function convertTextNodeToNode(
  document: Document,
  element: Element,
): void {
  Array.from(element.childNodes)
    .filter(
      (e): boolean => {
        return e.nodeName === '#text';
      },
    )
    .map(
      (e): void => {
        const newElement = document.createElement('span');
        newElement.textContent = e.textContent;
        element.replaceChild(newElement, e);
      },
    );
}

export function removeRubyInAElements(document: Document): void {
  queryARubyParents(document).map(
    (parent): void => {
      Array.from(parent.childNodes)
        .filter(
          (child): boolean => {
            return (child as Element).outerHTML !== undefined;
          },
        )
        .map(
          (child): void => {
            copyAttributes(parent, child as Element);
            parent.insertAdjacentElement('beforebegin', child as Element);
          },
        );

      parent.remove();
    },
  );
  // console.log('Finished');
  // console.log(document.querySelectorAll('ruby[href]').length);

  return;
}
