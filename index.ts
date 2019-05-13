enum Mode {
  Char = 1,
  Tag = 2,
  Whitespace = 3
}

enum Output {
  HTML = "html",
  JSON = "json"
}

enum Actions {
  Replace = 1,
  Delete = 2,
  Insert = 3,
  Equal = 4
}

interface Word {
  text: string;
  index: number;
  id: string;
}

interface Match {
  startInOld: number;
  startInNew: number;
  size: number;
}

interface Operation {
  action: number;
  startInOld: number;
  endInOld: number;
  startInNew: number;
  endInNew: number;
}

interface Options {
  output: string;
  enableScore?: boolean;
}

interface DiffBuilder {
  oldHTML: string;
  newHTML: string;
  oldWords: Array<Word>;
  newWords: Array<Word>;
  wordIndices: Object;
  operations: Array<Operation>;
  content: string;
  result: Object;
  options: Options;
  diff: Diff;
}

interface Diff {
  changesets: Array<object>;
  ids: object;
}

const isWhiteSpace = new RegExp(/\s/);
const isWord = new RegExp(/[\w\#@]+/i);
const explode = (sequence: string): Array<string> => {
  return sequence.split("");
};
const isStartOfTag = (char: string): boolean => char === "<";
const isEndOfTag = (char: string): boolean => char === ">";

const proxifiedListObj = () => {
  return new Proxy(
    {},
    {
      set: function(obj, prop, value) {
        if (!obj[prop]) {
          return (obj[prop] = [value]);
        } else {
          return obj[prop].push(value);
        }
      }
    }
  );
};

const proxifiedIndexObj = () => {
  return new Proxy(
    {},
    {
      get: function(obj, prop) {
        if (!obj[prop]) {
          return 0;
        } else {
          return obj[prop];
        }
      }
    }
  );
};

const isOpeningTag = (item: string) => {
  return /^\s*<[^>]+>\s*$/.test(item);
};

const isClosingTag = (item: string) => {
  return /^\s*<\/[^>]+>\s*$/.test(item);
};

const isTag = (item: string) => {
  return isOpeningTag(item) || isClosingTag(item);
};

const REGEXPS = {
  scoreRegExp: /data-antar-score="([-+]?[0-9]*\.?[0-9]+)"/,
  idRegExp: /data-antar-id="(\w+)"/,
  commentRegExp: /^<!--\s[^--]*\s--/,
  attrRegExp: /[^\<\/\w+].*/g,
  commentEndRegExp: /<!-- end antar-id#(\w+) --/
};

const diff = (
  oldNode: Element,
  newNode: Element,
  options: Options = { output: Output.JSON, enableScore: true }
): Array<any> | string => {
  return new DiffBuilder(oldNode.innerHTML, newNode.innerHTML, options).build();
};

const slice = (
  words: Array<Word>,
  startIndex: number,
  endIndex: number
): Array<Word> => {
  return words.filter(w => w.index >= startIndex && w.index < endIndex);
};

class Diff {
  constructor() {
    this.changesets = [];
    this.ids = [];
  }
}

class Word {
  constructor(text: string, index: number, id?: string) {
    this.text = text;
    this.index = index;
    id && (this.id = id);
  }
}

class Match {
  constructor(startInOld: number, startInNew: number, size: number) {
    this.startInOld = startInOld;
    this.startInNew = startInNew;
    this.size = size;
  }

  endInOld(): number {
    return this.startInOld + this.size;
  }

  endInNew(): number {
    return this.startInNew + this.size;
  }
}

class Operation {
  constructor(
    action: number,
    startInOld: number,
    endInOld: number,
    startInNew: number,
    endInNew: number
  ) {
    this.action = action;
    this.startInOld = startInOld;
    this.endInOld = endInOld;
    this.startInNew = startInNew;
    this.endInNew = endInNew;
  }
}

class DiffBuilder {
  constructor(oldHTML: string, newHTML: string, options: Options) {
    this.oldHTML = oldHTML;
    this.newHTML = newHTML;
    this.options = options;
    this.content = "";
    this.result = {};
    this.diff = new Diff();
  }

  build() {
    this.convertToWords();
    this.indexNewWords();
    this.operations = this.findOperations();
    this.operations.forEach(operation => {
      this.performOperation(operation);
    });
    console.log("diff: ", this.diff);
    return this.content;
  }

  performOperation(operation: Operation): void {
    const { output } = this.options;
    switch (operation.action) {
      case Actions.Insert:
        this.insert(operation, "diffins", output);
        break;
      case Actions.Delete:
        this.delete(operation, "diffdel", output);
        break;
      case Actions.Replace:
        this.delete(operation, "diffmod", output);
        this.insert(operation, "diffmod", output);
        break;
      case Actions.Equal:
        this.equal(operation, output);
        break;
    }
  }

  insert(operation: Operation, clazz: string, output: string) {
    const words = slice(
      this.newWords,
      operation.startInNew,
      operation.endInNew
    );

    if (output === Output.HTML) {
      this.insertTag("ins", clazz, words.map(w => w.text));
    } else {
      this.diff.changesets.push({
        action: "INSERT",
        startIndex: operation.startInNew,
        endIndex: operation.endInNew,
        id: words.length ? words[0].id : null
      });
    }
  }

  delete(operation: Operation, clazz: string, output: string) {
    const words = slice(
      this.oldWords,
      operation.startInOld,
      operation.endInOld
    );
    if (output === Output.HTML) {
      this.insertTag("del", clazz, words.map(w => w.text));
    } else {
      this.diff.changesets.push({
        action: "DELETE",
        startIndex: operation.startInOld,
        endIndex: operation.endInOld,
        id: words.length ? words[0].id : null
      });
    }
  }

  equal(operation: Operation, output: string) {
    if (output === Output.HTML) {
      this.content += slice(
        this.newWords,
        operation.startInNew,
        operation.endInNew
      )
        .map(w => w.text)
        .join("");
    }
  }

  findConsecutiveIndex(words: Array<string>, condition: Function): number {
    let indexOfFirstTag: number;
    let index = 0;
    for (let word of words) {
      if (condition(word)) {
        indexOfFirstTag = index;
        break;
      }
      index++;
    }
    return typeof indexOfFirstTag !== "undefined"
      ? indexOfFirstTag
      : words.length;
  }

  wrapText(text: string, tagName: string, cssClass: string): string {
    return `<${tagName} class="${cssClass}">${text}</${tagName}>`;
  }

  insertTag(tagName: string, cssClass: string, words: Array<string>) {
    while (true) {
      if (!words.length) {
        break;
      }
      const nontagIndex = this.findConsecutiveIndex(words, (word: string) =>
        isTag(word)
      );
      const nontags = words.splice(0, nontagIndex);
      if (nontags.length) {
        this.content += this.wrapText(nontags.join(""), tagName, cssClass);
      }

      if (!words.length) {
        break;
      }
      const tagIndex = this.findConsecutiveIndex(
        words,
        (word: string) => !isTag(word)
      );
      const tags = words.splice(0, tagIndex);
      this.content += this.wrapText(tags.join(""), tagName, cssClass);
    }
  }

  convertHTMLToListOfWords(html: string): Array<Word> {
    const initialWords = explode(html);
    const { output } = this.options;
    let mode = Mode.Char;
    let currentWord = "";
    let currentId = null;
    let words = [];
    let index = 0;
    const {
      idRegExp,
      scoreRegExp,
      commentEndRegExp,
      commentRegExp,
      attrRegExp
    } = REGEXPS;

    initialWords.forEach(char => {
      switch (mode) {
        case Mode.Tag:
          if (isEndOfTag(char)) {
            let id =
              idRegExp.test(currentWord) && currentWord.match(idRegExp)[1];

            let score =
              scoreRegExp.test(currentWord) &&
              currentWord.match(scoreRegExp)[1];

            if (id) {
              currentId = id;
              if (output === Output.JSON) {
                this.diff.ids[id] = { id, score };
              }
            }

            if (commentEndRegExp.test(currentWord)) {
              const endId = currentWord.match(commentEndRegExp)[1];
              if (endId === currentId) {
                currentId = null;
                currentWord = null;
              }
            }

            if (currentWord && !commentRegExp.test(currentWord)) {
              currentWord = currentWord.replace(attrRegExp, "");
            }

            if (currentWord) {
              currentWord += ">";
              words.push(new Word(currentWord, index++, currentId));
            }

            currentWord = "";
            if (isWhiteSpace.test(char)) {
              mode = Mode.Whitespace;
            } else {
              mode = Mode.Char;
            }
          } else {
            currentWord += char;
          }
          break;

        case Mode.Char:
          if (isStartOfTag(char)) {
            if (currentWord) {
              words.push(new Word(currentWord, index++, currentId));
            }

            currentWord = "<";
            mode = Mode.Tag;
          } else if (isWhiteSpace.test(char)) {
            if (currentWord) {
              words.push(new Word(currentWord, index++, currentId));
            }

            currentWord = char;
            mode = Mode.Whitespace;
          } else if (isWord.test(char)) {
            currentWord += char;
          } else {
            if (currentWord) {
              words.push(new Word(currentWord, index++, currentId));
            }
            currentWord = char;
          }
          break;

        case Mode.Whitespace:
          if (isStartOfTag(char)) {
            if (currentWord) {
              words.push(new Word(currentWord, index++, currentId));
            }

            currentWord = "<";
            mode = Mode.Tag;
          } else if (isWhiteSpace.test(char)) {
            currentWord += char;
          } else {
            if (currentWord) {
              words.push(new Word(currentWord, index++, currentId));
            }
            currentWord = char;
            mode = Mode.Char;
          }
          break;

        default:
          throw new TypeError("Unknown mode");
      }
    });

    if (currentWord) {
      words.push(new Word(currentWord, index++, currentId));
    }

    return words;
  }

  convertToWords(): void {
    this.oldWords = this.convertHTMLToListOfWords(this.oldHTML);
    this.newWords = this.convertHTMLToListOfWords(this.newHTML);
  }

  indexNewWords(): void {
    this.wordIndices = proxifiedListObj();
    this.newWords.forEach((word: Word, i) => {
      this.wordIndices[word.text] = i;
    });
  }

  findOperations(): Array<Operation> {
    let oldPosition = 0;
    let newPosition = 0;
    let operations = [];
    let matches = this.findAllMatchingBlocks(
      0,
      this.oldWords.length,
      0,
      this.newWords.length
    );

    matches = [
      ...matches,
      new Match(this.oldWords.length, this.newWords.length, 0)
    ];

    let action: number;
    matches.forEach((match, i) => {
      let matchInOld = oldPosition === match.startInOld;
      let matchInNew = newPosition === match.startInNew;

      if (!matchInOld && !matchInNew) {
        action = Actions.Replace;
      } else if (matchInOld && !matchInNew) {
        action = Actions.Insert;
      } else if (!matchInOld && matchInNew) {
        action = Actions.Delete;
      } else {
        action = null;
      }

      if (action) {
        let operation = new Operation(
          action,
          oldPosition,
          match.startInOld,
          newPosition,
          match.startInNew
        );
        operations = operations.concat(operation);
      }

      if (match.size) {
        let operation = new Operation(
          Actions.Equal,
          match.startInOld,
          match.endInOld(),
          match.startInNew,
          match.endInNew()
        );
        operations = operations.concat(operation);
      }

      oldPosition = match.endInOld();
      newPosition = match.endInNew();
    });

    return operations;
  }

  findAllMatchingBlocks(
    startInOld: number,
    endInOld: number,
    startInNew: number,
    endInNew: number,
    matchingBlocks: Array<Match> = []
  ): Array<Match> {
    let match = this.findMatch(startInOld, endInOld, startInNew, endInNew);

    if (match) {
      if (startInOld < match.startInOld && startInNew < match.startInNew) {
        this.findAllMatchingBlocks(
          startInOld,
          match.startInOld,
          startInNew,
          match.startInNew,
          matchingBlocks
        );
      }

      matchingBlocks.push(match);

      if (match.endInOld() < endInOld && match.endInNew() < endInNew) {
        this.findAllMatchingBlocks(
          match.endInOld(),
          endInOld,
          match.endInNew(),
          endInNew,
          matchingBlocks
        );
      }
    }

    return matchingBlocks;
  }

  findMatch(
    startInOld: number,
    endInOld: number,
    startInNew: number,
    endInNew: number
  ): Match {
    let bestMatchInOld = startInOld;
    let bestMatchInNew = startInNew;
    let bestMatchSize = 0;
    let matchLengthAt = proxifiedIndexObj();

    for (
      let indexInOld = startInOld;
      indexInOld <= endInOld - 1;
      indexInOld++
    ) {
      let newMatchLengthAt = proxifiedIndexObj();

      //Find old word match in indices of new words
      let newIndices = this.wordIndices[this.oldWords[indexInOld].text];

      //Go through the indices of the match
      if (Array.isArray(newIndices)) {
        for (let j = 0; j < newIndices.length; j++) {
          let indexInNew = newIndices[j];

          if (indexInNew < startInNew) {
            continue;
          } else if (indexInNew >= endInNew) {
            break;
          }

          let newMatchLength = matchLengthAt[indexInNew - 1] + 1;
          newMatchLengthAt[indexInNew] = newMatchLength;

          if (newMatchLength > bestMatchSize) {
            bestMatchInOld = indexInOld - newMatchLength + 1;
            bestMatchInNew = indexInNew - newMatchLength + 1;
            bestMatchSize = newMatchLength;
          }
        }
      }

      matchLengthAt = newMatchLengthAt;
    }

    return bestMatchSize !== 0
      ? new Match(bestMatchInOld, bestMatchInNew, bestMatchSize)
      : null;
  }
}

export default diff;
