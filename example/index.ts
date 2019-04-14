import antar from "../index";
const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
// antar(page1.innerHTML, page2.innerHTML);
console.log("a b c", "|", "a c");
antar("a b c", "a c");
console.log("-------");
console.log("a b c", "|", "a c z");
antar("a b c", "a c z");
