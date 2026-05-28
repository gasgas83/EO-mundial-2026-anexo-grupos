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

  const RESULTS_BASE_URL = "https://n8n.elobservador.com.uy/jsons/mundial2026";
  const DEFAULT_POLL_INTERVAL = 2 * 60 * 1000;
  const flagsBasePath = "https://strapi.elobservador.com.uy/eo-widgets/eo-mundial/eo-anexo-grupos/flags/teams";
  const argentinaTeamId = 21;
  const defaultHighlightedTeamIds = [172];
  const highlightedTeamsByUrlSlug = {
    argentina: argentinaTeamId,
    espana: 280,
    "estados unidos": 281,
  };

  const textCorrections = {
    "m�xico": "México",
    "pa�ses bajos": "Países Bajos",
    "sud�frica": "Sudáfrica",
    "rep�blica checa": "República Checa",
    "republica checa": "República Checa",
    "canad�": "Canadá",
    "espa�a": "España",
    "turqu�a": "Turquía",
    "uzbekist�n": "Uzbekistán",
    "bosnia-herz.": "Bosnia y Herz.",
    "jap�n": "Japón",
    "t�nez": "Túnez",
    "ir�n": "Irán",
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
    "republica checa": "Rep. Checa",
    "rd congo": "R. D. Congo",
    "r d congo": "R. D. Congo",
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
      .replace(/Pa�ses/gi, "Países")
      .replace(/Jap�n/gi, "Japón")
      .replace(/Rep�blica/gi, "República")
      .replace(/Canad�/gi, "Canadá")
      .replace(/Panam�/gi, "Panamá")
      .replace(/Turqu�a/gi, "Turquía")
      .replace(/Uzbekist�n/gi, "Uzbekistán")
      .replace(/T�nez/gi, "Túnez")
      .replace(/Ir�n/gi, "Irán")
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

  const getPageUrlContext = () => {
    if (typeof window === "undefined") return "";

    const ancestorOrigins = window.location?.ancestorOrigins ? Array.from(window.location.ancestorOrigins) : [];
    return [window.location?.href, document?.referrer, ...ancestorOrigins].filter(Boolean).join(" ");
  };

  const getHighlightedTeamIds = (urlContext) => {
    const highlightedIds = new Set();
    const normalizedUrl = normalizeText(urlContext);
    if (!normalizedUrl) return new Set(defaultHighlightedTeamIds);

    for (const [slug, id] of Object.entries(highlightedTeamsByUrlSlug)) {
      if (normalizedUrl.includes(slug)) highlightedIds.add(id);
    }

    return highlightedIds.size ? highlightedIds : new Set(defaultHighlightedTeamIds);
  };

  const isHighlightedTeam = (team) => highlightedTeamIds.has(Number(team?.sourceId));

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
  let displayedGroups = groups;
  let useSwiper = true;
  let rootElement;
  let groupTabsElement;
  let resizeObserver;
  let isMobile = false;
  let activeMobileGroup = "";
  let hasUserSelectedMobileGroup = false;
  let pageUrlContext = "";
  let lastAutoScrolledGroup = "";

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
      slidesPerView: "auto",
      slidesPerGroup: 1,
      spaceBetween: 34,
      breakpointsBase: "container",
      navigation: false,
      pagination: false,
      breakpoints: {
        1120: {
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

  const scrollSwiperToGroup = async (groupLetter) => {
    if (!groupLetter || normalizedShowGroup || !swiperInitialized || !swiperContainer?.swiper) return;
    if (lastAutoScrolledGroup === groupLetter) return;

    const groupIndex = visibleGroups.findIndex((group) => group.letter === groupLetter);
    if (groupIndex < 0) return;

    lastAutoScrolledGroup = groupLetter;
    await tick();
    swiperContainer.swiper.update();
    swiperContainer.swiper.slideTo(groupIndex, 450);
    syncNavState();
  };

  const slidePrev = () => {
    swiperContainer?.swiper?.slidePrev();
  };

  const slideNext = () => {
    swiperContainer?.swiper?.slideNext();
  };

  const selectMobileGroup = (letter) => {
    hasUserSelectedMobileGroup = true;
    activeMobileGroup = letter;
  };

  const scrollMobileTabsToGroup = async (groupLetter) => {
    if (!groupLetter || !groupTabsElement) return;

    await tick();
    const activeTab = groupTabsElement.querySelector(`[data-group="${groupLetter}"]`);
    activeTab?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  onMount(() => {
    pageUrlContext = getPageUrlContext();

    if (rootElement) {
      isMobile = rootElement.getBoundingClientRect().width < 640;
    }

    if (rootElement && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(([entry]) => {
        isMobile = entry.contentRect.width < 640;
      });
      resizeObserver.observe(rootElement);
    }

    loadGroups();
    if (!isMobile) initSwiper();

    return () => {
      clearTimeout(pollTimeout);
      destroySwiper();
      resizeObserver?.disconnect();
    };
  });

  $: resultsUrl = `${RESULTS_BASE_URL}/EO-df-grupos${parseBoolean(isDev) ? "-dev" : ""}.json`;
  $: normalizedShowGroup = sanitizeText(showGroup).toUpperCase().trim();
  $: highlightedTeamIds = getHighlightedTeamIds(pageUrlContext);
  $: showSponsorLogo = highlightedTeamIds.has(argentinaTeamId);
  $: visibleGroups = normalizedShowGroup ? groups.filter((group) => group.letter === normalizedShowGroup) : groups;
  $: highlightedTeamGroup = highlightedTeamIds.size ? groups.find((group) => group.teams.some(isHighlightedTeam))?.letter || "" : "";
  $: activeMobileGroup = normalizedShowGroup || (hasUserSelectedMobileGroup && activeMobileGroup && groups.some((group) => group.letter === activeMobileGroup) ? activeMobileGroup : highlightedTeamGroup || visibleGroups[0]?.letter || "A");
  $: displayedGroups = isMobile && !normalizedShowGroup ? visibleGroups.filter((group) => group.letter === activeMobileGroup) : visibleGroups;
  $: useSwiper = visibleGroups.length > 1 && !isMobile;
  $: if (isMobile && swiperInitialized) {
    destroySwiper();
  }
  $: if (groups.length && swiperContainer && !swiperInitialized && !isMobile) {
    initSwiper();
  }
  $: if (highlightedTeamGroup && swiperInitialized && !isMobile) {
    scrollSwiperToGroup(highlightedTeamGroup);
  }
  $: if (isMobile && !normalizedShowGroup && activeMobileGroup) {
    scrollMobileTabsToGroup(activeMobileGroup);
  }
</script>

<div class="eo-grupos" bind:this={rootElement}>
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
    {#if showSponsorLogo}
      <img class="eo-grupos__logo" src="https://especiales.elobservador.com.uy/interactivo/widgets/eo-countdown-mundial-2026/ypf.png" alt="YPF" loading="lazy" />
    {/if}
  </div>

  {#if isMobile && !normalizedShowGroup}
    <div class="eo-grupos__group-tabs-wrap">
      <div class="eo-grupos__group-tabs" aria-label="Seleccionar grupo" bind:this={groupTabsElement}>
        {#each visibleGroups as group}
          <button type="button" data-group={group.letter} class:is-active={group.letter === activeMobileGroup} aria-pressed={group.letter === activeMobileGroup} on:click={() => selectMobileGroup(group.letter)}>
            {group.letter}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="eo-grupos__table-wrap">
    {#if useSwiper}
      <button class="eo-grupos__nav eo-grupos__nav--prev" aria-label="Grupo anterior" on:click={slidePrev} disabled={!canSlidePrev}>‹</button>
      <swiper-container init="false" bind:this={swiperContainer} class="eo-grupos__swiper">
        {#each displayedGroups as group}
          <swiper-slide>
            <section class="eo-group">
              <header>
                <h3>Grupo {group.letter}</h3>
                <div class="eo-group__cols">
                  <span>PJ</span>
                  <span>PG</span>
                  <span>PE</span>
                  <span>PP</span>
                  <span>GF</span>
                  <span>GC</span>
                  <span>DG</span>
                  <span>Pts</span>
                </div>
              </header>

              <div class="eo-group__rows">
                {#if group.teams.length}
                  {#each group.teams as team, teamIndex}
                    <article class="eo-row" class:is-selected-row={isHighlightedTeam(team)} class:is-lower-ranked={hasPointsData && teamIndex > 1}>
                      <span class="eo-row__position">{teamIndex + 1}</span>
                      <div class="eo-row__team">
                        {#if team.flagUrl}<img src={team.flagUrl} alt={team.displayName} loading="lazy" />{/if}
                        <strong>{team.displayName}</strong>
                      </div>
                      <div class="eo-row__stats">
                        <span>{team.played}</span><span>{team.won}</span><span>{team.draw}</span><span>{team.lost}</span><span>{team.goalsFor}</span><span>{team.goalsAgainst}</span><span>{team.goalDiff}</span>
                        <span class="eo-row__points {hasPointsData && teamIndex < 2 ? 'is-qualified' : hasPointsData && teamIndex === 2 ? 'is-possible' : ''}">{team.points}</span>
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
      {#each displayedGroups as group (group.letter)}
        <section class="eo-group eo-group--single" class:is-mobile-group-change={isMobile && !normalizedShowGroup}>
          <header>
            <h3>Grupo {group.letter}</h3>
            <div class="eo-group__cols">
              <span>PJ</span><span>PG</span><span>PE</span><span>PP</span><span>GF</span><span>GC</span><span>DG</span><span>Pts</span>
            </div>
          </header>
          <div class="eo-group__rows">
            {#if group.teams.length}
              {#each group.teams as team, teamIndex}
                <article class="eo-row" class:is-selected-row={isHighlightedTeam(team)} class:is-lower-ranked={hasPointsData && teamIndex > 1}>
                  <span class="eo-row__position">{teamIndex + 1}</span>
                  <div class="eo-row__team">
                    {#if team.flagUrl}<img src={team.flagUrl} alt={team.displayName} loading="lazy" />{/if}<strong>{team.displayName}</strong>
                  </div>
                  <div class="eo-row__stats">
                    <span>{team.played}</span><span>{team.won}</span><span>{team.draw}</span><span>{team.lost}</span><span>{team.goalsFor}</span><span>{team.goalsAgainst}</span><span>{team.goalDiff}</span>
                    <span class="eo-row__points {hasPointsData && teamIndex < 2 ? 'is-qualified' : hasPointsData && teamIndex === 2 ? 'is-possible' : ''}">{team.points}</span>
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
    --eo-slide-width: 450px;
    --eo-swiper-gap: 34px;
    background: radial-gradient(circle at left 20%, rgba(75, 75, 75, 0.16), transparent 38%), var(--eo-bg);
    color: var(--eo-text);
    font-family: "Instrument Sans", sans-serif;
    padding: 30px;
    max-width: 1200px;
    margin: 0 auto;
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

  .eo-grupos__group-tabs-wrap {
    position: relative;
  }

  .eo-grupos__group-tabs-wrap::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 46px;
    pointer-events: none;
    background: linear-gradient(90deg, rgba(23, 26, 25, 0), var(--eo-bg) 82%);
  }

  .eo-grupos__group-tabs {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: -8px 0 18px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .eo-grupos__group-tabs::-webkit-scrollbar {
    display: none;
  }

  .eo-grupos__group-tabs button {
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.66);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    font-family: "Instrument Sans", sans-serif;
    font-size: 15px;
    font-weight: 500;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    transition:
      background 0.2s ease,
      color 0.2s ease;
  }

  .eo-grupos__group-tabs button.is-active {
    background: var(--eo-blue);
    color: #fff;
  }

  .eo-group {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: 0 2px 8px;
    border-right: 2px solid #535353;
    padding-right: 30px;
  }
  .eo-group--single {
    border-right: 0;
    padding-right: 0;
  }

  .eo-group--single.is-mobile-group-change {
    animation: mobileGroupChange 0.28s ease both;
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
    font-size: 20px;
    font-weight: 500;
    line-height: 1;
  }

  .eo-group__cols,
  .eo-row__stats {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 0px;
    text-align: center;
    align-items: center;
  }

  .eo-group__cols {
    min-width: 288px;
    color: rgba(255, 255, 255, 0.407);
    font-size: 15px;
    line-height: 1.1;
  }

  .eo-group__cols span:last-child {
    font-weight: 700;
    color: #fff;
  }

  .eo-row {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) auto;
    align-items: center;
    gap: 0px;
    min-height: 46px;
  }

  .eo-row__position {
    font-size: 20px;
    line-height: 1;
  }

  .eo-row__team {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .eo-row__team img {
    width: 25px;

    object-fit: contain;
    border: 1px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
  }

  .eo-row__team strong {
    font-size: 18px;
    line-height: 1;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition:
      color 0.2s ease,
      text-shadow 0.2s ease;
  }

  .eo-row.is-lower-ranked {
    color: rgba(255, 255, 255, 0.58);
  }

  .eo-row.is-lower-ranked .eo-row__team img {
    opacity: 0.72;
  }

  .eo-row.is-lower-ranked .eo-row__stats {
    color: rgba(255, 255, 255, 0.58);
  }

  .eo-row.is-lower-ranked .eo-row__team strong {
    color: rgba(255, 255, 255, 0.428);
  }

  .eo-row.is-lower-ranked .eo-row__points {
    color: rgba(255, 255, 255, 0.72);
  }

  .eo-row.is-selected-row {
    background: #3c5dac;
    margin-left: -12px;
    padding-right: 3px;
    padding-left: 13px;
    width: calc(100% - 2px);
  }

  .eo-row__stats {
    min-width: 290px;
    font-size: 14px;
    line-height: 1.1;
    color: rgba(255, 255, 255, 0.428);
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
    background: #3d3d3d;
    border-bottom: 4px solid transparent;
    color: #fff;
    line-height: 1;
  }

  .eo-row__points.is-qualified {
    border-bottom-color: var(--eo-blue);
  }

  .eo-row__points.is-possible {
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

  .eo-grupos__swiper swiper-slide {
    width: var(--eo-slide-width);
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

  @keyframes mobileGroupChange {
    0% {
      opacity: 0.58;
      transform: translateX(10px);
      filter: brightness(1.18);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
      filter: brightness(1);
    }
  }

  @container eo-grupos (max-width: 1000px) {
    .eo-group {
      padding-left: 0;
    }
  }

  @container eo-grupos (min-width: 1120px) {
    .eo-grupos__swiper swiper-slide {
      width: calc((100% - var(--eo-swiper-gap)) / 2);
    }

    .eo-grupos__swiper swiper-slide:nth-child(even) .eo-group {
      border-right: 0;
    }
  }

  @container eo-grupos (min-width: 700px) and (max-width: 1119px) {
    .eo-grupos__table-wrap::after {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 6;
      width: 70px;
      pointer-events: none;
      background: linear-gradient(90deg, rgba(45, 46, 49, 0), var(--eo-panel) 82%);
    }
  }

  @container eo-grupos (max-width: 699px) {
    .eo-grupos__swiper swiper-slide {
      width: 100%;
    }
  }

  @container eo-grupos (max-width: 640px) {
    .eo-group {
      overflow: hidden;
    }
    .eo-grupos {
      padding: 14px 10px 18px;
    }

    .eo-grupos__header {
      gap: 12px;
    }

    .eo-grupos__header h2 {
      font-size: 14px;
    }

    .eo-grupos__header p {
      margin: 8px 0 20px;
      font-size: 9px;
    }

    .eo-grupos__logo {
      height: 21px;
    }

    .eo-grupos__table-wrap {
      padding: 14px 12px 16px;
      overflow-x: auto;
    }

    .eo-group {
      border-right: 0;
      padding: 0;
    }

    .eo-group header {
      grid-template-columns: 112px auto;
      gap: 8px;
      margin-bottom: 8px;
    }

    .eo-group h3 {
      font-size: 12px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.66);
      text-transform: uppercase;
    }

    .eo-group__cols,
    .eo-row__stats {
      grid-template-columns: repeat(8, 22px);
      gap: 0px;
      // min-width: 204px;
    }

    .eo-group__cols {
      font-size: 11px;
      margin-left: -2px;
    }

    .eo-row {
      grid-template-columns: 0 minmax(104px, 1fr) auto;
      gap: 8px;
      min-height: 27px;
    }

    .eo-row__position {
      display: none;
    }

    .eo-row__team {
      gap: 4px;
      min-width: 101px;
    }

    .eo-row__team img {
      width: 14px;
      height: 10px;
    }

    .eo-row__team strong {
      font-size: 15px;
    }

    .eo-row__stats {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      margin-left: 110px;
    }

    .eo-group__cols span,
    .eo-row__stats span {
      min-height: 18px;
    }

    .eo-row__points {
      min-width: 22px;
      height: 24px;
    }

    .eo-row.is-selected-row {
      margin-left: -6px;
      padding-left: 5px;
    }

    .eo-grupos__legend {
      align-items: flex-start;
      flex-direction: column;
      // flex-direction: row;
      gap: 11px;
      font-size: 11px;
    }
  }
</style>
