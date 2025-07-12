import { mount } from "svelte";
import SidePanel from "../../components/SidePanel.svelte";
import "../content/styles.css";


// Side panel
// https://developer.chrome.com/docs/extensions/reference/sidePanel/

function render() {
    const target = document.getElementById("app");

    if (target) {
        mount(SidePanel, { target });
    }
}

document.addEventListener("DOMContentLoaded", render);
