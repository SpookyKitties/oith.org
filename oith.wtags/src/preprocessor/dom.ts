import { JSDOM } from 'jsdom';
import { readFile } from 'fs-extra';
export async function loadFile(fileName: string): Promise<JSDOM> {
  try {
    const file = await readFile(fileName);
    return new JSDOM(file.toString());
  } catch (error) {
    console.log(error);
    throw `Couldn't load dom`;
  }
}

function convertHrefs(document: Document): void {
  Array.from(document.querySelectorAll(`a[href*='..']`)).map(
    (a): void => {
      const regex = new RegExp(
        /((?<=(([\.\.\/]{2,3}))(scriptures\/)(.+?\/)).+\/.+)/s,
      );

      ///Matches everything else
      const regex2 = new RegExp(/((?<=(([\.\.\/]{2}))(scriptures\/)).+\/.+)/s);
      let href = a.getAttribute('href');
      href = href
        ? href
            .replace('.html', '')
            .replace('?verse=', '.')
            .replace('#p', '.')
            .replace('#', '.')
        : '';
      const regex1Test = regex.test(href);
      let exec: RegExpExecArray | null;
      if (regex1Test) {
        exec = regex.exec(href);
      } else {
        exec = regex2.exec(href);
      }
      if (exec) {
        try {
          a.setAttribute('href', exec[0]);
        } catch (error) {
          console.log(error);
        }
      }
    },
  );
}

export function queryVerses(document: Document): NodeListOf<Element> {
  convertHrefs(document);
  return document.querySelectorAll(
    'header > *,.hidden-paragraph > .verse, .body-block > p, nav > ul > li > *, .body-block > div > *,.body-block .verse',
  );
}
export function convertTextNodeToNode(
  document: Document,
  element: Element,
): void {
  // console.log(element.outerHTML);

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

export function queryARubyParents(document: Document): Element[] {
  const verseElements = queryVerses(document);
  const t: string[] = ['a[href] ruby'];
  const parents: Element[] = [];

  Array.from(verseElements).map(
    (verseElement): void => {
      verseElement.querySelectorAll(t.toString()).forEach(
        (ar): void => {
          if (ar.parentElement) {
            parents.push(ar.parentElement);
          }
        },
      );
    },
  );

  parents.map(
    (parent): void => {
      convertTextNodeToNode(document, parent);
    },
  );
  return parents;
}

export function getElementIds(elements: Element[] | Element): string[] {
  return ((elements as []).map
    ? (elements as Element[])
    : ([elements] as Element[])
  ).map(
    (element): string => {
      return element.id;
    },
  );
}
