import antar from "../index";
import scorer from "antar-scorer";
const page1 = document.createElement("iframe");
page1.src = "page1.html";
page1.onload = function() {
  let index = 0;
  page1.contentDocument.body.querySelectorAll("*").forEach(node => {
    node.setAttribute("data-antar-id", "" + index++);
  });
  scorer.score(page1.contentDocument.body.innerHTML, page1.contentDocument);
};
document.body.appendChild(page1);
const page2 = document.createElement("iframe");
page2.src = "page2.html";
page2.onload = function() {
  const output = antar(
    page1.contentDocument.body.innerHTML,
    page2.contentDocument.body.innerHTML,
    { output: "html" }
  );
  const div = document.createElement("div");
  div.innerHTML = <string>output;
  document.body.appendChild(div);
};
document.body.appendChild(page2);
// const output = antar(page1.innerHTML, page2.innerHTML, { output: "html" });
// console.log(output);
// div.innerHTML = <string>output;
// document.body.appendChild(div);

// console.log("a b c", "|", "a c");
// antar("a b c", "a c", { output: "html" });
// console.log("-------");
// console.log("a b c", "|", "a c z");
// antar("a b c", "a c z", { output: "html" });
// console.log("a c", "|", "a b c");
// antar("a c", "a b c", { output: "html" });
// console.log("a b c", "|", "a d c");
// antar("a b c", "a d c", { output: "html" });
// console.log(
//   "这个是中文内容, Ruby is the bast",
//   "这是中国语内容，Ruby is the best language."
// );
// antar(
//   "这个是中文内容, Ruby is the bast",
//   "这是中国语内容，Ruby is the best language.",
//   { output: "html" }
// );
// console.log("a word is here", "|", "a nother word is there");
// antar("a word is here", "a nother word is there", { output: "html" });
