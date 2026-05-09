import EOResultadosMundial from './lib/EOgruposMundial.svelte';

if (!customElements.get('eo-grupos-mundial')) {
    customElements.define('eo-grupos-mundial', EOResultadosMundial);
} else {
    console.log('Custom element with name "eo-grupos-mundial" already defined');
}