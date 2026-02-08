export const tokenType = {};
const tthelper = [
    "Tag",
    "Colon",
    "Semicolon",
    "Props",
    "Dataset",
    "Classes",
    "Ids",
    "Content",
    "Style",
    "Block",
    "String",
    "From",
    "Import",
    "EOF"
];

for (let i = 0; i < tthelper.length; i++)
    tokenType[tthelper[i]] = i;