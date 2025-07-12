import { defineContentScript } from '#imports';
import './styles.css';

export default defineContentScript({
  matches: ["<all_urls>"],
  main: () => {
    console.log("content script loaded");
  },
});
