import antar from "../index";
const page1 = document.createElement("iframe");
page1.src = "page1.html";
let output;
page1.onload = function() {
  const page2 = document.createElement("iframe");
  page2.src = "page2.html";
  page2.onload = function() {
    const html = antar.diffDocument(
      page1.contentDocument,
      page2.contentDocument,
      {
        enableScore: true
      }
    );
    document.getElementsByClassName("diff-output")[0].innerHTML = <string>html;

    output = antar.diffDocument(page1.contentDocument, page2.contentDocument, {
      output: "split",
      enableScore: true
    });
  };
  document.body.appendChild(page2);

  document
    .getElementsByClassName("diff-btn")[0]
    .addEventListener("click", function() {
      (<HTMLElement>(
        document.getElementsByClassName("diff-overlay")[0]
      )).style.display = "flex";
      const leftNode = document.getElementsByClassName("diff-overlay-left")[0];
      leftNode.innerHTML = output[0];
      const rightNode = document.getElementsByClassName(
        "diff-overlay-right"
      )[0];
      rightNode.innerHTML = output[1];
    });

  document
    .getElementsByClassName("diff-overlay-close")[0]
    .addEventListener("click", function() {
      (<HTMLElement>(
        document.getElementsByClassName("diff-overlay")[0]
      )).style.display = "none";
    });
};
document.body.appendChild(page1);

console.log("a b c", "|", "a c");
console.log(antar.diff("a b c", "a c"));
console.log("-------");
console.log("a b c", "|", "a c z");
antar.diff("a b c", "a c z");
console.log("a c", "|", "a b c");
antar.diff("a c", "a b c");
console.log("a b c", "|", "a d c");
antar.diff("a b c", "a d c");
console.log(
  "这个是中文内容, Ruby is the bast",
  "这是中国语内容，Ruby is the best language."
);
antar.diff(
  "这个是中文内容, Ruby is the bast",
  "这是中国语内容，Ruby is the best language."
);
console.log("a word is here", "|", "a nother word is there");
antar.diff("a word is here", "a nother word is there");
