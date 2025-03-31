import { mount } from "svelte";
import App from "../App.svelte";
import "./popup.css";
import "../app.css";

// Action popup
// https://developer.chrome.com/docs/extensions/reference/action/

// Garantir que o tema escuro esteja aplicado
function ensureDarkTheme() {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark:bg-gray-900');
}

function render() {
    console.log("Renderizando popup...");
    ensureDarkTheme(); // Aplicar tema escuro
    
    const target = document.getElementById("app");

    if (target) {
        console.log("Elemento #app encontrado, montando App");
        try {
            mount(App, { target });
            console.log("Popup montado com sucesso");
        } catch (error) {
            console.error("Erro ao montar o App:", error);
        }
    } else {
        console.error("Elemento #app não encontrado no DOM");
    }
}

document.addEventListener("DOMContentLoaded", render);
