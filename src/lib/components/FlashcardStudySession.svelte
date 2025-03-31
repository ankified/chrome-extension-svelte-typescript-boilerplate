<script lang="ts">
  import type { Flashcard } from "../../types";
  import { flashcards } from "../../storage";
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import { onMount } from 'svelte';

  let { cards } = $props<{
    cards: Flashcard[]
  }>();

  // Estado da sessão de estudo
  let currentIndex = $state(0);
  let showAnswer = $state(false);
  let studyQueue = $state<Flashcard[]>([]);
  let completedCards = $state<Flashcard[]>([]);
  let isSessionActive = $state(false);
  
  // Configurações da sessão
  let maxCards = $state(10);
  let selectedTags = $state<string[]>([]);
  
  // Lista de todas as tags disponíveis
  let allTags = $derived([...new Set($flashcards.flatMap(card => card.tags))]);
  
  // Número de cartões disponíveis para a sessão
  // Função auxiliar para contagem
  function countAvailableCards(): number {
    if (cards && cards.length > 0) {
      return cards.filter((card: Flashcard) => {
        if (selectedTags.length > 0) {
          return card.tags.some((tag: string) => selectedTags.includes(tag));
        }
        return true;
      }).length;
    }
    
    return $flashcards.filter((card: Flashcard) => {
      if (selectedTags.length > 0) {
        return card.tags.some((tag: string) => selectedTags.includes(tag));
      }
      return true;
    }).length;
  }
  
  // Variável derivada para contagem
  let availableCardsCount = $derived(countAvailableCards());
  
  onMount(() => {
    // Se cards for fornecido e não vazio, iniciar a sessão automaticamente
    if (cards && cards.length > 0) {
      console.log(`FlashcardStudySession: Recebido ${cards.length} cards via prop`);
      startSession();
    }
  });
  
  // Inicia uma nova sessão de estudo
  function startSession() {
    const cardsToStudy = (() => {
      if (cards && cards.length > 0) {
        return cards.filter((card: Flashcard) => {
          if (selectedTags.length > 0) {
            return card.tags.some((tag: string) => selectedTags.includes(tag));
          }
          return true;
        });
      }
      
      return $flashcards.filter((card: Flashcard) => {
        if (selectedTags.length > 0) {
          return card.tags.some((tag: string) => selectedTags.includes(tag));
        }
        return true;
      });
    })();
    
    if (cardsToStudy.length === 0) return;
    
    // Embaralhar e selecionar os cartões
    const shuffled = [...cardsToStudy];
    shuffled.sort(() => Math.random() - 0.5);
    studyQueue = shuffled.slice(0, Math.min(maxCards, shuffled.length));
    completedCards = [];
    currentIndex = 0;
    showAnswer = false;
    isSessionActive = true;
  }
  
  // Cartão atual sendo estudado
  let currentCard = $derived(
    isSessionActive && studyQueue.length > 0 ? studyQueue[currentIndex] : null
  );
  
  // Revela a resposta do cartão atual
  function revealAnswer() {
    showAnswer = true;
  }
  
  // Avalia o conhecimento do usuário no cartão atual
  function rateCard(rating: number) {
    if (!currentCard) return;
    
    // Aqui implementamos o algoritmo SM-2 para espaçamento de repetições
    // Ajustamos o fator de facilidade e o intervalo com base na avaliação
    const card = { ...currentCard };
    
    // Atualizar o contador de revisões
    card.reviewCount = (card.reviewCount || 0) + 1;
    
    // Ajustar o fator de facilidade (EF) baseado na classificação (1-5)
    // Quanto menor a classificação, mais o EF diminui
    const oldEF = card.easeFactor || 2.5;
    card.easeFactor = Math.max(1.3, oldEF + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)));
    
    // Atualizar a data da última modificação
    card.lastModified = Date.now();
    
    // Adicionar à lista de completados
    completedCards = [...completedCards, card];
    
    // Atualizar a store de flashcards
    flashcards.update(allCards => 
      allCards.map(c => c.id === card.id ? card : c)
    );
    
    // Avançar para o próximo cartão
    nextCard();
  }
  
  // Avança para o próximo cartão
  function nextCard() {
    if (currentIndex < studyQueue.length - 1) {
      currentIndex++;
      showAnswer = false;
    } else {
      // Sessão finalizada
      endSession();
    }
  }
  
  // Encerra a sessão de estudo
  function endSession() {
    isSessionActive = false;
  }
  
  // Alterna a seleção de uma tag
  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter(t => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
  }
</script>

<div class="flashcard-study-session">
  {#if !isSessionActive}
    <div class="setup-panel p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 class="text-xl font-semibold mb-4">Configurar Sessão de Estudo</h2>
      
      <div class="mb-4">
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Número de cartões:
        </label>
        <input 
          type="number" 
          bind:value={maxCards}
          min="1" 
          max="100" 
          class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      
      {#if allTags.length > 0}
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Filtrar por tags:
          </label>
          <div class="tags-selector flex flex-wrap gap-2">
            {#each allTags as tag}
              <button 
                class="tag px-3 py-1 text-sm rounded-full {selectedTags.includes(tag) ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}"
                onclick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            {/each}
          </div>
        </div>
      {/if}
      
      <div class="session-info mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
        <p class="text-sm">
          Cartões disponíveis: <span class="font-semibold">{availableCardsCount}</span>
        </p>
        <p class="text-sm">
          Serão estudados: <span class="font-semibold">{Math.min(maxCards, availableCardsCount)}</span>
        </p>
      </div>
      
      <button 
        onclick={startSession}
        disabled={availableCardsCount === 0}
        class="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Iniciar Sessão de Estudo
      </button>
      
      {#if availableCardsCount === 0}
        <p class="mt-2 text-center text-sm text-red-500">
          Não há cartões disponíveis com os filtros atuais.
        </p>
      {/if}
    </div>
  {:else if currentCard}
    <div class="study-panel p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div class="session-progress mb-4">
        <div class="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Progresso: {currentIndex + 1} de {studyQueue.length}</span>
          <button 
            onclick={endSession}
            class="text-blue-600 dark:text-blue-400"
          >
            Finalizar sessão
          </button>
        </div>
        <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            class="h-full bg-blue-600 transition-all"
            style="width: {((currentIndex + 1) / studyQueue.length) * 100}%"
          ></div>
        </div>
      </div>
      
      <div class="flashcard-display p-4 rounded border border-gray-300 dark:border-gray-700" style="background-color: {currentCard.color || '#20b2aa'}">
        <div class="mb-6">
          <h3 class="text-lg font-medium mb-4">Pergunta:</h3>
          <div class="p-3 rounded min-h-[100px] whitespace-pre-wrap">
            {currentCard.front}
          </div>
        </div>
        
        {#if showAnswer}
          <div class="mb-6">
            <h3 class="text-lg font-medium mb-4">Resposta:</h3>
            <div class="p-3 rounded min-h-[100px] whitespace-pre-wrap">
              {currentCard.back}
            </div>
          </div>
          
          <div class="rating-controls">
            <h3 class="text-lg font-medium mb-2">Como você se saiu?</h3>
            <div class="flex flex-wrap gap-2">
              <button 
                onclick={() => rateCard(1)}
                class="flex-1 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Difícil
              </button>
              <button 
                onclick={() => rateCard(3)}
                class="flex-1 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Médio
              </button>
              <button 
                onclick={() => rateCard(5)}
                class="flex-1 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Fácil
              </button>
            </div>
          </div>
        {:else}
          <div class="reveal-controls">
            <button 
              onclick={revealAnswer}
              class="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Mostrar Resposta
            </button>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="session-complete p-4 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
      <h2 class="text-xl font-semibold mb-4">Sessão Concluída!</h2>
      <p class="mb-4">Você estudou {completedCards.length} cartões.</p>
      
      <button 
        onclick={startSession}
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
      >
        Nova Sessão
      </button>
      <button 
        onclick={endSession}
        class="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
      >
        Voltar
      </button>
    </div>
  {/if}
</div> 