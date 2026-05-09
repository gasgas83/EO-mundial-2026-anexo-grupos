<svelte:options
  customElement={{
    tag: "eo-grupos-mundial",
    shadow: "open",
  }}
/>

<script>
  import { onMount, tick } from "svelte";
  import { register } from "swiper/element/bundle";
  import teams from "../data/teams.json";

  if (typeof window !== "undefined") {
    register();
  }

  export let isDev = "false";
  export let showGroup = "";
  export let teamSelect = "";

  const RESULTS_BASE_URL = "https://n8n.elobservador.com.uy/jsons/mundial2026";
  const DEFAULT_POLL_INTERVAL = 2 * 60 * 1000;
  const flagsBasePath = "https://strapi.elobservador.com.uy/eo-widgets/eo-mundial/eo-anexo-grupos/flags/teams";

  const textCorrections = {
    "m�xico": "México",
    "sud�frica": "Sudáfrica",
    "rep�blica checa": "República Checa",
    "canad�": "Canadá",
    "espa�a": "España",
    "turqu�a": "Turquía",
    "bosnia-herz.": "Bosnia y Herz.",
    "jap�n": "Japón",
    "t�nez": "Túnez",
    iran: "Irán",
    "hait�": "Haití",
    "panam�": "Panamá",
    "turqu�a": "Turquía",
    "canad�": "Canadá",
    suecia: "Suecia",
  };

  const teamAliases = {
    "arabia saudita": "A. Saudita",
    "bosnia-herz": "Bosnia y Herz.",
    "bosnia-herz.": "Bosnia y Herz.",
    "bosnia y herzegovina": "Bosnia y Herz.",
    "costa de marfil": "C. de Marfil",
    "estados unidos": "EEUU",
    "nueva zelanda": "N. Zelanda",
    "rep de corea": "R. de Corea",
    "republica de corea": "R. de Corea",
    "paises bajos": "Países Bajos",
  };

  const parseBoolean = (value) => value === true || value === "" || String(value).toLowerCase() === "true" || String(value) === "1";

  const fixEncoding = (value) => {
    if (typeof value !== "string") return value;

    try {
      return decodeURIComponent(escape(value));
    } catch {
      return value;
    }
  };

  const sanitizeText = (value = "") => {
    const decoded = fixEncoding(String(value)).trim();
    if (!decoded) return "";

    const lowerDecoded = decoded.toLowerCase();
    if (textCorrections[lowerDecoded]) return textCorrections[lowerDecoded];

    // Fallback for common feed mojibake with replacement chars.
    return decoded
      .replace(/�frica/gi, "áfrica")
      .replace(/Jap�n/gi, "Japón")
      .replace(/Canad�/gi, "Canadá")
      .replace(/Panam�/gi, "Panamá")
      .replace(/Turqu�a/gi, "Turquía")
      .replace(/T�nez/gi, "Túnez")
      .replace(/Hait�/gi, "Haití")
      .replace(/M�xico/gi, "México")
      .replace(/Espa�a/gi, "España");
  };

  const normalizeText = (value = "") =>
    sanitizeText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .toLowerCase();

  const formatLastUpdate = (date) =>
    new Intl.DateTimeFormat("es-UY", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);

  const groupsOrder = "ABCDEFGHIJKL".split("");
  const teamsByName = new Map();

  for (const team of teams) {
    teamsByName.set(normalizeText(team.nombre), team);
    teamsByName.set(normalizeText(team.nombreCorto), team);
  }

  for (const [alias, teamName] of Object.entries(teamAliases)) {
    const team = teams.find((item) => item.nombre === teamName);
    if (team) teamsByName.set(alias, team);
  }

  const getTeamData = (rawTeam) => {
    const nameCandidates = [rawTeam?.name, rawTeam?.shortName, rawTeam?.sigla].map(sanitizeText).filter(Boolean);

    for (const name of nameCandidates) {
      const match = teamsByName.get(normalizeText(name));
      if (match) {
        return {
          id: match.id,
          displayName: match.nombre,
          shortName: match.nombreCorto || match.nombre,
          flagUrl: match.bandera ? `${flagsBasePath}/${match.bandera}` : "",
        };
      }
    }

    const fallback = sanitizeText(rawTeam?.name || rawTeam?.shortName || rawTeam?.sigla || "Equipo");
    return {
      id: null,
      displayName: fallback,
      shortName: sanitizeText(rawTeam?.sigla || fallback),
      flagUrl: "",
    };
  };

  const getTeamFromNode = (node) => {
    const attrs = node.attributes;
    return {
      sourceId: Number(attrs.getNamedItem("id")?.value || 0),
      group: sanitizeText(attrs.getNamedItem("zona")?.value || ""),
      name: sanitizeText(node.querySelector("nombre")?.textContent || ""),
      shortName: sanitizeText(attrs.getNamedItem("nombreCorto")?.value || ""),
      sigla: sanitizeText(attrs.getNamedItem("sigla")?.value || ""),
      order: Number(attrs.getNamedItem("orden")?.value || 999),
      points: Number(node.querySelector("puntos")?.textContent || 0),
      played: Number(node.querySelector("jugados")?.textContent || 0),
      won: Number(node.querySelector("ganados")?.textContent || 0),
      draw: Number(node.querySelector("empatados")?.textContent || 0),
      lost: Number(node.querySelector("perdidos")?.textContent || 0),
      goalsFor: Number(node.querySelector("golesfavor")?.textContent || 0),
      goalsAgainst: Number(node.querySelector("golescontra")?.textContent || 0),
      goalDiff: Number(node.querySelector("difgol")?.textContent || 0),
    };
  };

  const buildGroups = (xmlString) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    const equipoNodes = Array.from(xmlDoc.querySelectorAll("equipo"));

    const grouped = new Map(groupsOrder.map((group) => [group, []]));

    for (const node of equipoNodes) {
      const parsed = getTeamFromNode(node);
      const teamData = getTeamData(parsed);
      const groupLetter = sanitizeText(parsed.group).replace("Grupo", "").trim().toUpperCase();

      if (!grouped.has(groupLetter)) {
        grouped.set(groupLetter, []);
      }

      grouped.get(groupLetter).push({
        ...parsed,
        ...teamData,
      });
    }

    for (const [group, list] of grouped.entries()) {
      list.sort((a, b) => a.order - b.order || b.points - a.points || b.goalDiff - a.goalDiff);
      grouped.set(group, list.slice(0, 4));
    }

    return groupsOrder.map((group) => ({
      letter: group,
      teams: grouped.get(group) || [],
    }));
  };

  let groups = groupsOrder.map((letter) => ({ letter, teams: [] }));
  let lastUpdated = "";
  let errorMessage = "";
  let pollTimeout;
  let swiperContainer;
  let swiperInitialized = false;
  let hasPointsData = false;
  let canSlidePrev = false;
  let canSlideNext = true;
  let visibleGroups = groups;
  let useSwiper = true;

  const loadGroups = async () => {
    try {
      const response = await fetch(resultsUrl, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`No se pudo cargar el endpoint: ${response.status}`);
      }

      const payload = await response.json();
      groups = buildGroups(payload?.data || "");
      hasPointsData = groups.some((group) => group.teams.some((team) => Number(team.points) > 0));
      lastUpdated = formatLastUpdate(new Date());
      errorMessage = "";
    } catch (error) {
      console.error(error);
      errorMessage = "No pudimos actualizar los grupos.";
    } finally {
      clearTimeout(pollTimeout);
      pollTimeout = window.setTimeout(loadGroups, DEFAULT_POLL_INTERVAL);
    }
  };

  const initSwiper = async () => {
    await tick();

    if (!swiperContainer || swiperInitialized) return;

    Object.assign(swiperContainer, {
      slidesPerView: 2,
      slidesPerGroup: 2,
      spaceBetween: 34,
      breakpointsBase: "container",
      navigation: false,
      pagination: false,
      breakpoints: {
        0: {
          slidesPerView: 1,
          slidesPerGroup: 1,
        },
        1000: {
          slidesPerView: 2,
          slidesPerGroup: 2,
        },
      },
    });

    swiperContainer.initialize();
    swiperContainer.addEventListener("swiperslidechange", syncNavState);
    swiperInitialized = true;
    syncNavState();
  };

  const destroySwiper = () => {
    if (swiperContainer) {
      swiperContainer.removeEventListener("swiperslidechange", syncNavState);
    }
    if (swiperContainer?.swiper) {
      swiperContainer.swiper.destroy(true, true);
    }
    swiperInitialized = false;
  };

  const syncNavState = () => {
    const swiper = swiperContainer?.swiper;
    if (!swiper) return;
    canSlidePrev = !swiper.isBeginning;
    canSlideNext = !swiper.isEnd;
  };

  const slidePrev = () => {
    swiperContainer?.swiper?.slidePrev();
  };

  const slideNext = () => {
    swiperContainer?.swiper?.slideNext();
  };

  onMount(() => {
    loadGroups();
    initSwiper();

    return () => {
      clearTimeout(pollTimeout);
      destroySwiper();
    };
  });

  $: resultsUrl = `${RESULTS_BASE_URL}/EO-df-grupos${parseBoolean(isDev) ? "-dev" : ""}.json`;
  $: normalizedShowGroup = sanitizeText(showGroup).toUpperCase().trim();
  $: visibleGroups = normalizedShowGroup ? groups.filter((group) => group.letter === normalizedShowGroup) : groups;
  $: useSwiper = visibleGroups.length > 1;
  $: if (groups.length && swiperContainer && !swiperInitialized) {
    initSwiper();
  }
</script>

<div class="eo-grupos">
  <div class="eo-grupos__header">
    <div>
      <h2>Fase de grupos</h2>
      <p>
        {#if errorMessage}
          {errorMessage}
        {:else if lastUpdated}
          ÚLTIMA ACTUALIZACIÓN: <strong>{lastUpdated}</strong>
        {:else}
          CARGANDO...
        {/if}
      </p>
    </div>
    <img class="eo-grupos__logo" src="https://especiales.elobservador.com.uy/interactivo/widgets/eo-countdown-mundial-2026/ypf.png" alt="YPF" loading="lazy" />
  </div>

  <div class="eo-grupos__table-wrap">
    {#if useSwiper}
      <button class="eo-grupos__nav eo-grupos__nav--prev" aria-label="Grupo anterior" on:click={slidePrev} disabled={!canSlidePrev}>‹</button>
      <swiper-container init="false" bind:this={swiperContainer} class="eo-grupos__swiper">
        {#each visibleGroups as group}
          <swiper-slide>
            <section class="eo-group">
              <header>
                <h3>Grupo {group.letter}</h3>
                <div class="eo-group__cols">
                  <span>MP</span>
                  <span>W</span>
                  <span>D</span>
                  <span>L</span>
                  <span>GF</span>
                  <span>GA</span>
                  <span>GD</span>
                  <span>Pts</span>
                </div>
              </header>

              <div class="eo-group__rows">
                {#if group.teams.length}
                  {#each group.teams as team, teamIndex}
                    <article class="eo-row" class:is-selected-row={String(team.id) === String(teamSelect).trim() || String(team.sourceId) === String(teamSelect).trim()}>
                      <span class="eo-row__position">{teamIndex + 1}</span>
                      <div class="eo-row__team">
                        {#if team.flagUrl}<img src={team.flagUrl} alt={team.displayName} loading="lazy" />{/if}
                        <strong>{team.displayName}</strong>
                      </div>
                      <div class="eo-row__stats">
                        <span>{team.played}</span><span>{team.won}</span><span>{team.draw}</span><span>{team.lost}</span><span>{team.goalsFor}</span><span>{team.goalsAgainst}</span><span>{team.goalDiff}</span>
                        <span class="eo-row__points {hasPointsData && teamIndex === 0 ? 'is-top' : hasPointsData && teamIndex === 1 ? 'is-second' : ''}">{team.points}</span>
                      </div>
                    </article>
                  {/each}
                {:else}
                  {#each Array.from({ length: 4 }) as _, teamIndex}
                    <article class="eo-row is-empty">
                      <span class="eo-row__position">{teamIndex + 1}</span>
                      <div class="eo-row__team"><strong>Equipo</strong></div>
                      <div class="eo-row__stats"><span>0</span><span>0</span><span>0</span><span>0</span><span>0</span><span>0</span><span>0</span><span class="eo-row__points">0</span></div>
                    </article>
                  {/each}
                {/if}
              </div>
            </section>
          </swiper-slide>
        {/each}
      </swiper-container>
      <button class="eo-grupos__nav eo-grupos__nav--next" aria-label="Grupo siguiente" on:click={slideNext} disabled={!canSlideNext}>›</button>
    {:else}
      {#each visibleGroups as group}
        <section class="eo-group eo-group--single">
          <header>
            <h3>Grupo {group.letter}</h3>
            <div class="eo-group__cols">
              <span>MP</span><span>W</span><span>D</span><span>L</span><span>GF</span><span>GA</span><span>GD</span><span>Pts</span>
            </div>
          </header>
          <div class="eo-group__rows">
            {#if group.teams.length}
              {#each group.teams as team, teamIndex}
                <article class="eo-row" class:is-selected-row={String(team.id) === String(teamSelect).trim() || String(team.sourceId) === String(teamSelect).trim()}>
                  <span class="eo-row__position">{teamIndex + 1}</span>
                  <div class="eo-row__team">
                    {#if team.flagUrl}<img src={team.flagUrl} alt={team.displayName} loading="lazy" />{/if}<strong>{team.displayName}</strong>
                  </div>
                  <div class="eo-row__stats">
                    <span>{team.played}</span><span>{team.won}</span><span>{team.draw}</span><span>{team.lost}</span><span>{team.goalsFor}</span><span>{team.goalsAgainst}</span><span>{team.goalDiff}</span>
                    <span class="eo-row__points {hasPointsData && teamIndex === 0 ? 'is-top' : hasPointsData && teamIndex === 1 ? 'is-second' : ''}">{team.points}</span>
                  </div>
                </article>
              {/each}
            {:else}
              {#each Array.from({ length: 4 }) as _, teamIndex}
                <article class="eo-row is-empty">
                  <span class="eo-row__position">{teamIndex + 1}</span>
                  <div class="eo-row__team"><strong>Equipo</strong></div>
                  <div class="eo-row__stats"><span>0</span><span>0</span><span>0</span><span>0</span><span>0</span><span>0</span><span>0</span><span class="eo-row__points">0</span></div>
                </article>
              {/each}
            {/if}
          </div>
        </section>
      {/each}
    {/if}
  </div>

  <footer class="eo-grupos__legend">
    <span><i class="legend-blue"></i>Clasificados 16avos de final</span>
    <span><i class="legend-yellow"></i>Posibles clasificados</span>
  </footer>
</div>

<style lang="scss">
  :host {
    display: block;
    width: 100%;
  }

  :global(eo-grupos-mundial) {
    display: block;
    width: 100%;
  }

  @font-face {
    font-display: swap;
    font-family: "Instrument Sans Condensed";
    font-style: normal;
    font-weight: 400;
    src:
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-Regular.eot?") format("eot"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-Regular.woff2") format("woff2"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-Regular.woff") format("woff"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-Regular.ttf") format("truetype"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-Regular.svg#Instrument_Sans_Condensed") format("svg");
  }

  @font-face {
    font-display: swap;
    font-family: "Instrument Sans Condensed";
    font-style: normal;
    font-weight: 500;
    src:
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-Medium.eot?") format("eot"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-Medium.woff2") format("woff2"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-Medium.woff") format("woff"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-Medium.ttf") format("truetype"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-Medium.svg#Instrument_Sans_Condensed") format("svg");
  }

  @font-face {
    font-display: swap;
    font-family: "Instrument Sans Condensed";
    font-style: normal;
    font-weight: 600;
    src:
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-SemiBold.eot?") format("eot"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-SemiBold.woff2") format("woff2"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-SemiBold.woff") format("woff"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-SemiBold.ttf") format("truetype"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansCondensed-SemiBold.svg#Instrument_Sans_Condensed") format("svg");
  }

  @font-face {
    font-display: swap;
    font-family: "Instrument Sans SemiCondensed";
    font-style: normal;
    font-weight: 400;
    src:
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Regular.eot?") format("eot"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Regular.woff2") format("woff2"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Regular.woff") format("woff"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Regular.ttf") format("truetype"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Regular.svg#Instrument_Sans_SemiCondensed") format("svg");
  }

  @font-face {
    font-display: swap;
    font-family: "Instrument Sans SemiCondensed";
    font-style: normal;
    font-weight: 500;
    src:
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Medium.eot?") format("eot"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Medium.woff2") format("woff2"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Medium.woff") format("woff"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Medium.ttf") format("truetype"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Medium.svg#Instrument_Sans_SemiCondensed") format("svg");
  }

  @font-face {
    font-display: swap;
    font-family: "Instrument Sans SemiCondensed";
    font-style: normal;
    font-weight: 600;
    src:
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Bold.eot?") format("eot"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Bold.woff2") format("woff2"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Bold.woff") format("woff"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Bold.ttf") format("truetype"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument SansSemiCondensed-Bold.svg#Instrument_Sans_SemiCondensed") format("svg");
  }

  @font-face {
    font-display: swap;
    font-family: "Instrument Sans";
    font-style: normal;
    font-weight: 400;
    src:
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Regular.eot?") format("eot"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Regular.woff2") format("woff2"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Regular.woff") format("woff"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Regular.ttf") format("truetype"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Regular.svg#Instrument_Sans") format("svg");
  }

  @font-face {
    font-display: swap;
    font-family: "Instrument Sans";
    font-style: normal;
    font-weight: 500;
    src:
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Medium.eot?") format("eot"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Medium.woff2") format("woff2"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Medium.woff") format("woff"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Medium.ttf") format("truetype"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Medium.svg#Instrument_Sans") format("svg");
  }

  @font-face {
    font-display: swap;
    font-family: "Instrument Sans";
    font-style: normal;
    font-weight: 600;
    src:
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Bold.eot?") format("eot"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Bold.woff2") format("woff2"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Bold.woff") format("woff"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Bold.ttf") format("truetype"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/Instrument Sans-Bold.svg#Instrument_Sans") format("svg");
  }

  @font-face {
    font-display: swap;
    font-family: "Libre Baskerville";
    font-style: normal;
    font-weight: 400;
    src:
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/LibreBaskerville-Regular.eot?") format("eot"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/LibreBaskerville-Regular.woff2") format("woff2"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/LibreBaskerville-Regular.woff") format("woff"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/LibreBaskerville-Regular.ttf") format("truetype"),
      url("https://www.elobservador.com.uy/css-custom/elobservador/fonts/LibreBaskerville-Regular.svg#Libre_Baskerville") format("svg");
  }

  .eo-grupos {
    container: eo-grupos / inline-size;
    --eo-bg: #171a19;
    --eo-panel: #2d2e31;
    --eo-text: #f2f2f2;
    --eo-muted: rgba(255, 255, 255, 0.293);
    --eo-blue: #2f6bff;
    --eo-yellow: #d3ad2b;
    --eo-swiper-arrow-size: 30px;
    --eo-swiper-arrow-bg: rgba(255, 255, 255, 0.22);
    --eo-swiper-arrow-color: #ffffff;
    --eo-swiper-arrow-hover-bg: rgba(255, 255, 255, 0.32);
    --eo-swiper-arrow-offset: -15px;
    --eo-swiper-bullet-size: 5px;
    --eo-swiper-bullet-gap: 5px;
    --eo-swiper-bullet-color: rgba(255, 255, 255, 0.42);
    --eo-swiper-bullet-active: #ffffff;
    background: radial-gradient(circle at left 20%, rgba(75, 75, 75, 0.16), transparent 38%), var(--eo-bg);
    color: var(--eo-text);
    font-family: "Instrument Sans", sans-serif;
    padding: 30px;
  }

  .eo-grupos__header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 16px;
  }

  .eo-grupos__header h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 200;
    line-height: 1;
  }

  .eo-grupos__header p {
    margin: 12px 0 26px;
    color: var(--eo-muted);
    font-size: 14px;
    font-weight: 100;
    line-height: 1;
  }

  .eo-grupos__logo {
    display: block;
    height: 20px;
    width: auto;
  }

  .eo-grupos__table-wrap {
    background: var(--eo-panel);
    padding: 26px 30px;
    position: relative;
    overflow: visible;
  }

  .eo-group {
    padding: 0 2px 8px;
    border-right: 2px solid #535353;
    padding-right: 30px;
  }
  .eo-group--single {
    border-right: 0;
    padding-right: 0;
    width: 100%;
  }

  .eo-group header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 10px;
    margin-bottom: 8px;
  }

  .eo-group h3 {
    margin: 0;
    font-size: 26px;
    font-weight: 500;
    line-height: 1;
  }

  .eo-group__cols,
  .eo-row__stats {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 10px;
    text-align: center;
    align-items: center;
  }

  .eo-group__cols {
    min-width: 357px;
    color: rgba(255, 255, 255, 0.74);
    font-size: 16px;
    line-height: 1.1;
  }

  .eo-group__cols span:last-child {
    font-weight: 700;
    color: #fff;
  }

  .eo-row {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 46px;
  }

  .eo-row__position {
    font-size: 24px;
    line-height: 1;
  }

  .eo-row__team {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .eo-row__team img {
    width: 30px;
    height: 20px;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
  }

  .eo-row__team strong {
    font-size: 22px;
    line-height: 1;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition:
      color 0.2s ease,
      text-shadow 0.2s ease;
  }

  .eo-row.is-selected-row {
    background: rgba(255, 255, 255, 0.12);
    border-left: 3px solid rgba(255, 255, 255, 0.72);
    border-radius: 4px;
    padding-left: 8px;
    margin-left: -10px;
  }

  .eo-row__stats {
    min-width: 340px;
    font-size: 20px;
    line-height: 1.1;
    color: rgba(255, 255, 255, 0.76);
  }

  .eo-group__cols span,
  .eo-row__stats span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 24px;
  }

  .eo-row__points {
    min-width: 36px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.08);
    border-bottom: 4px solid transparent;
    color: #fff;
  }

  .eo-row__points.is-top {
    border-bottom-color: var(--eo-blue);
  }

  .eo-row__points.is-second {
    border-bottom-color: var(--eo-yellow);
  }

  .eo-row.is-empty {
    opacity: 0.55;
  }

  .eo-grupos__legend {
    margin-top: 18px;
    display: flex;
    gap: 20px;
    color: rgba(255, 255, 255, 0.72);
    font-size: 14px;
  }

  .eo-grupos__legend span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .eo-grupos__legend i {
    width: 3px;
    height: 18px;
    display: inline-block;
    border-radius: 8px;
  }

  .legend-blue {
    background: var(--eo-blue);
  }

  .legend-yellow {
    background: var(--eo-yellow);
  }

  .eo-grupos__swiper {
    width: 100%;
    overflow: visible;
    --swiper-navigation-color: var(--eo-swiper-arrow-color);
    --swiper-theme-color: var(--eo-swiper-arrow-color);
    --swiper-pagination-bullet-inactive-color: var(--eo-swiper-bullet-color);
    --swiper-pagination-color: var(--eo-swiper-bullet-active);
    --swiper-pagination-bullet-size: var(--eo-swiper-bullet-size);
    --swiper-pagination-bullet-horizontal-gap: var(--eo-swiper-bullet-gap);
  }

  .eo-grupos__nav {
    width: var(--eo-swiper-arrow-size);
    height: var(--eo-swiper-arrow-size);
    background: var(--eo-swiper-arrow-bg);
    color: var(--eo-swiper-arrow-color);
    border: 0;
    border-radius: 999px;
    position: absolute;
    top: 50%;
    z-index: 7;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 26px;
    line-height: 1;
    padding: 0;
    padding-bottom: 2px;
    transition:
      background 0.2s ease,
      transform 0.2s ease;
  }

  .eo-grupos__nav--prev {
    left: var(--eo-swiper-arrow-offset);
  }

  .eo-grupos__nav--next {
    right: var(--eo-swiper-arrow-offset);
  }

  .eo-grupos__nav:hover:not(:disabled) {
    background: var(--eo-swiper-arrow-hover-bg);
    transform: translateY(-50%) scale(1.06);
  }

  .eo-grupos__nav:disabled {
    opacity: 0.35;
    pointer-events: none;
  }

  :global(.eo-grupos__swiper .swiper-pagination) {
    display: none;
  }

  @container eo-grupos (max-width: 1000px) {
    .eo-group {
      padding: 0;
    }
  }
</style>
