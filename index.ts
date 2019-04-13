/**
 *  diff = {
  [
    id: 1,
    priority: (1|2),
    changeset: {
      replace: [
        {
          text: ‘hello’,
          Index: 1,
          change: ‘world is dead’ 
        }
      ],
      insert: [
        {
          text: ‘hello’,
          index: 1,
          pos: (before|after),
          change: ‘world’
        }
      ],
      delete:[
        {
          text: ‘world’,
          index: 2,
          pos: (before|after),
          change: ‘hello’
        }
      ] 
    }
  ]
}
 **/

interface Diff {}

interface Changeset {}

enum ContentScore {}

enum Mode {
  Char = 1,
  Tag = 2,
  Whitespace = 3
}

enum Actions {
  Replace = 1,
  Delete = 2,
  Insert = 3,
  Equal = 4
}

const isWhiteSpace = new RegExp(/\s/);
const isWord = new RegExp(/[\w\#@]+/i);
const explode = (sequence: string): Array<string> => {
  return sequence.split("");
};
const isStartOfTag = (char: string): boolean => char === "<";
const isEndOfTag = (char: string): boolean => char === ">";
const convertHTMLToListOfWords = (html: string): Array<string> => {
  const initialWords = explode(html);
  let mode = Mode.Char;
  let currentWord = "";
  let words = [];

  initialWords.forEach(char => {
    switch (mode) {
      case Mode.Tag:
        if (isEndOfTag(char)) {
          currentWord = ">";
          words.push(currentWord);
          currentWord = "";
          if (isWhiteSpace.test(char)) {
            mode = Mode.Whitespace;
          } else {
            mode = Mode.Char;
          }
        } else {
          currentWord = currentWord.concat(char);
        }
        break;

      case Mode.Char:
        if (isStartOfTag(char)) {
          if (currentWord) {
            words.push(currentWord);
          }

          currentWord = "<";
          mode = Mode.Tag;
        } else if (isWhiteSpace.test(char)) {
          if (currentWord) {
            words.push(currentWord);
          }

          currentWord = char;
          mode = Mode.Whitespace;
        } else if (isWord.test(char)) {
          currentWord = currentWord.concat(char);
        } else {
          if (currentWord) {
            words.push(currentWord);
          }
          currentWord = char;
        }
        break;

      case Mode.Whitespace:
        if (isStartOfTag(char)) {
          if (currentWord) {
            words.push(currentWord);
          }

          currentWord = "<";
          mode = Mode.Tag;
        } else if (isWhiteSpace.test(char)) {
          currentWord = currentWord.concat(char);
        } else {
          if (currentWord) {
            words.push(currentWord);
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
    words.push(currentWord);
  }

  return words;
};

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

const diff = (oldHTML: string, newHTML: string): Array<any> => {
  return new DiffBuilder(oldHTML, newHTML).build();
};

interface Match {
  startInOld: number;
  startInNew: number;
  size: number;
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

interface Operation {
  action: number;
  startInOld: number;
  endInOld: number;
  startInNew: number;
  endInNew: number;
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

interface DiffBuilder {
  oldHTML: string;
  newHTML: string;
  oldWords: Array<string>;
  newWords: Array<string>;
  wordIndices: Map;
  operations: Array;
}

class DiffBuilder {
  constructor(oldHTML: string, newHTML: string) {
    this.oldHTML = oldHTML;
    this.newHTML = newHTML;
  }

  build() {
    this.convertToWords();
    this.indexNewWords();
    this.operations = this.findOperations();
    console.log("operations: ", this.operations);
    this.operations.forEach(operation => {
      this.performOperation(operation);
    });
    return [];
  }

  performOperation(operation: Operation): void {
    switch (operation.action) {
      case Actions.Insert:
        break;
    }
  }

  convertToWords(): void {
    this.oldWords = convertHTMLToListOfWords(this.oldHTML);
    this.newWords = convertHTMLToListOfWords(this.newHTML);
  }

  indexNewWords(): void {
    this.wordIndices = proxifiedListObj();
    this.newWords.forEach((word, i) => {
      this.wordIndices[word] = i;
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

    let action;
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
          oldPosition,
          match.startInOld,
          newPosition,
          match.startInNew
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
      matchingBlocks.push(match);

      if (startInOld < match.startInOld && startInNew < match.startInNew) {
        return this.findAllMatchingBlocks(
          startInOld,
          match.startInOld,
          startInNew,
          match.startInNew,
          matchingBlocks
        );
      }

      if (match.endInOld() < endInOld && match.endInNew() < endInNew) {
        return this.findAllMatchingBlocks(
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
      let newIndices = this.wordIndices[this.oldWords[indexInOld]];

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
