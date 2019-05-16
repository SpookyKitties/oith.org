import * as cuid from 'cuid';
import { writeFileSync } from 'fs-extra';
import { normalize } from 'path';
import { WTagGroupType } from '../enums/WTagGroupType';
import { queryVerses, convertTextNodeToNode, getElementIds } from './dom';
import { WTagGroup } from '../interfaces/WTagGroup';
import { WTagGroupA, Verse } from '../..';
/*
  WTagGroups were necessitaed by the need to preserve some the existing structure found in the source files,
  without having to include the information as WTag information. During development of the WTags, two potentially
  huges problems arose: A and Ruby tags. Most of the scripture text is ultimately just text with some styling.
  Its styling and function are not dependent on the tag it is in. Any special styling can be provided by css.

  This is not the case with A and Ruby tags. The problems with WTags were discovered when trying to include A tags.
  Unlike other tags, A tags already do something when you click them. This meant that all of the WTag functions couldn't
  apply to them. They could pick up styling and maybe underlining, but they wouldn't support refs. WTags can very liberal
  in how they break up the text. Every single character in a verse can potentially have a unique set of WTags, and
  including the HREF of ATags in the WTags would mean potentially hundreds of single character A Tags on the page.
  HREF data can't be compressed, further adding to the data on page. So, while in theory it could work, it was decided that
  it would be better to try and preserve a single A Tag instead of breaking it up.

  Ruby tags are what cemented the idea. From their definition on W3Schools: "A ruby annotation is a small extra text,
  attached to the main text to indicate the pronunciation or meaning of the corresponding characters. This kind of
   annotation is often used in Japanese publications."  Unlike A tags, Ruby tags can't be broken up. Ruby tags are dependent on the structure
  <ruby><rb></rb><rt></rt></ruby>. A structure such as <ruby><rb></rb><rb></rb><rt></rt><rt></rt></ruby> or <ruby></ruby><ruby></ruby>
  would cause the characters to display incorrectly. Because of this, preserving this structure was critical




  ** It should be noted that the <rb></rb> part of the Ruby tag is not required. It is being preserved because of its use
  in the source documents. **

*/

class PreWTagGroup1 {
  public classList: string[] | undefined;
  public childNodes: Node[] = [];
  public length: number = 0;
  public id: string;
  public href: string | undefined;
  public type: WTagGroupType;
}
class PreWTagGroup2 {
  public classList: string[] | undefined;
  public charCount: [number, number]; //= 0;
  public type: WTagGroupType;
  public href: string | undefined;
  public id: string;
}
function getPreWTagGroup1Type(node: Node): WTagGroupType {
  switch (node.nodeName) {
    case 'A': {
      if ((node as Element).querySelectorAll('ruby').length > 0) {
        return WTagGroupType.ARuby;
      } else {
        return WTagGroupType.A;
      }
    }
    case 'RUBY': {
      return WTagGroupType.Ruby;
    }

    default:
      return WTagGroupType.Text;
  }
}

function nodeToPreWGroup1(node: Node, verse: Element): PreWTagGroup1 {
  let preWTagGroup1: PreWTagGroup1 = new PreWTagGroup1();

  preWTagGroup1 = new PreWTagGroup1();
  preWTagGroup1.id = verse.id;

  preWTagGroup1.length = node.textContent ? node.textContent.length - 1 : 0;
  preWTagGroup1.classList = verse.className.split(' ');
  preWTagGroup1.type = getPreWTagGroup1Type(node);
  const href = (node as Element).getAttribute('href');
  preWTagGroup1.href = href ? href : undefined;
  return preWTagGroup1;
}

function parseGroups(verse: Element): PreWTagGroup1[] {
  const preWTagGroup1s: PreWTagGroup1[] = [];

  let preWTagGroup1: PreWTagGroup1 | undefined;

  Array.from(verse.childNodes).map(
    (child): void => {
      switch (child.nodeName) {
        case 'A':
        case 'RUBY': {
          if (preWTagGroup1) {
            preWTagGroup1s.push(preWTagGroup1);
            preWTagGroup1 = undefined;
          }
          preWTagGroup1s.push(nodeToPreWGroup1(child, verse));
          break;
        }

        default: {
          if (preWTagGroup1) {
            preWTagGroup1.length =
              preWTagGroup1.length +
              (child.textContent ? child.textContent.length : 0);
          } else {
            preWTagGroup1 = nodeToPreWGroup1(child, verse);
          }
          break;
        }
      }
    },
  );

  if (preWTagGroup1) {
    preWTagGroup1s.push(preWTagGroup1);
  }
  return preWTagGroup1s;
}

function parseWTagStep1(document: Document): PreWTagGroup1[] {
  let preWTagGroup1s: PreWTagGroup1[] = [];
  const verses = queryVerses(document);
  Array.from(verses).map(
    (verse): void => {
      convertTextNodeToNode(document, verse);
      preWTagGroup1s = preWTagGroup1s.concat(parseGroups(verse));
    },
  );

  return preWTagGroup1s;
}

function parseWTagGroupStrp2(
  verseIds: string[],
  preWTagGroup1s: PreWTagGroup1[],
): PreWTagGroup2[] {
  const preWTagGroup2s: PreWTagGroup2[] = [];
  verseIds.map(
    (verseId): void => {
      let count = 0;
      preWTagGroup1s
        .filter(
          (preWTagGroup1): boolean => {
            return preWTagGroup1.id === verseId;
          },
        )
        .map(
          (preWTagGroup1): void => {
            const preWTagGroup2: PreWTagGroup2 = new PreWTagGroup2();
            preWTagGroup2.charCount = [count, count + preWTagGroup1.length];

            count = count + preWTagGroup1.length + 1;
            preWTagGroup2.classList = preWTagGroup1.classList;
            preWTagGroup2.id = preWTagGroup1.id;
            preWTagGroup2.type = preWTagGroup1.type;
            preWTagGroup2.href = preWTagGroup1.href;

            preWTagGroup2s.push(preWTagGroup2);
          },
        );
    },
  );

  return preWTagGroup2s;
}
function preWTagGroup2sToWTagGroup(
  preWTagGroup2s: PreWTagGroup2[],
): WTagGroup[] {
  return preWTagGroup2s.map(
    (preWTagGroup2): WTagGroup => {
      const wTagGroup: WTagGroup = {
        charCountCompress: preWTagGroup2.charCount,
        type: WTagGroupType.Text,
        charCount: undefined,
      };
      switch (preWTagGroup2.type) {
        case WTagGroupType.A: {
          wTagGroup.type = WTagGroupType.A;
          if (preWTagGroup2.href) {
            (wTagGroup as WTagGroupA).href = preWTagGroup2.href;
          }
          break;
        }
        case WTagGroupType.ARuby: {
          wTagGroup.type = WTagGroupType.ARuby;
          break;
        }
        case WTagGroupType.Ruby: {
          throw 'Ruby support not implemented yet';
          wTagGroup.type = WTagGroupType.Ruby;
          break;
        }
        case WTagGroupType.Text: {
          wTagGroup.type = WTagGroupType.Text;
          break;
        }
      }
      return wTagGroup;
    },
  );
}

function preWTagGroup2ToVerse(
  preWTagGroup2s: PreWTagGroup2[],
  verseElements: Element[],
): Verse[] {
  const verses: Verse[] = [];

  verseElements.map(
    (verse): void => {
      const preGroup = preWTagGroup2sToWTagGroup(
        preWTagGroup2s.filter(
          (p): boolean => {
            return p.id === verse.id;
          },
        ),
      );
      verses.push({
        _id: verse.id,
        _rev: undefined,
        classList: verse.className.split(' '),
        text: verse.textContent ? verse.textContent : '',
        wTagGroups: preGroup,
        wTags: [],
      });
    },
  );
  writeFileSync(normalize(`./data/${cuid()}.json`), JSON.stringify(verses));

  return verses;
}
export function parseWTagGroups(document: Document): Verse[] {
  const verseElements = Array.from(queryVerses(document));
  const preWTagGroup1s = parseWTagStep1(document);
  const preWTagGroup2 = parseWTagGroupStrp2(
    getElementIds(verseElements),
    preWTagGroup1s,
  );
  return preWTagGroup2ToVerse(preWTagGroup2, verseElements);

  // const wTagGroups: WTagGroup[] = [];

  // return wTagGroups;
}
