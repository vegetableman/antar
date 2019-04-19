import antar from "../index";
const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
const div = document.createElement("div");
const output = antar(page1.innerHTML, page2.innerHTML, { output: "html" });
div.innerHTML = <string>output;
document.body.appendChild(div);

console.log("a b c", "|", "a c");
antar("a b c", "a c", { output: "html" });
console.log("-------");
console.log("a b c", "|", "a c z");
antar("a b c", "a c z", { output: "html" });
console.log("a c", "|", "a b c");
antar("a c", "a b c", { output: "html" });
console.log("a b c", "|", "a d c");
antar("a b c", "a d c", { output: "html" });
console.log(
  "这个是中文内容, Ruby is the bast",
  "这是中国语内容，Ruby is the best language."
);
antar(
  "这个是中文内容, Ruby is the bast",
  "这是中国语内容，Ruby is the best language.",
  { output: "html" }
);
console.log("a word is here", "|", "a nother word is there");
antar("a word is here", "a nother word is there", { output: "html" });
