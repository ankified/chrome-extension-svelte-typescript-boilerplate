import { mount } from "svelte";
import Options from "./Options.svelte";
import "../app.css";
import "./options.css";
// import { count } from "../storage";

// Options
// https://developer.chrome.com/docs/extensions/mv3/options/

// Garantir que o tema escuro esteja aplicado
function ensureDarkTheme() {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark:bg-gray-900');
}

function render() {
    console.log("Renderizando página de opções...");
    ensureDarkTheme(); // Aplicar tema escuro
    
    const target = document.getElementById("app");
    
    if (target) {
        console.log("Elemento #app encontrado, montando Options");
        try {
            mount(Options, { target });
            console.log("Options montado com sucesso");
        } catch (error) {
            console.error("Erro ao montar Options:", error);
        }
    } else {
        console.error("Elemento #app não encontrado no DOM");
    }
}

document.addEventListener("DOMContentLoaded", render);
