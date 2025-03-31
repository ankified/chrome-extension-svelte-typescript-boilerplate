import { mount } from "svelte";
import Options from "../options/Options.svelte";
import "../app.css";
import "../options/options.css";
// import { count } from "../storage";

// Side panel
// https://developer.chrome.com/docs/extensions/reference/sidePanel/

// Garantir que o tema escuro esteja aplicado
function ensureDarkTheme() {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark:bg-gray-900');
}

function render() {
    console.log("Renderizando painel lateral...");
    ensureDarkTheme(); // Aplicar tema escuro
    
    const target = document.getElementById("app");
    
    if (target) {
        console.log("Elemento #app encontrado, montando Options");
        try {
            mount(Options, { target });
            console.log("Options montado com sucesso no painel lateral");
        } catch (error) {
            console.error("Erro ao montar Options no painel lateral:", error);
        }
    } else {
        console.error("Elemento #app não encontrado no DOM");
    }
}

document.addEventListener("DOMContentLoaded", render);
