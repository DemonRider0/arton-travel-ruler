import{_ as e,a as t,c as n,f as r,i,n as a,o,p as s,s as c,t as l,v as u,x as d}from"./sceneCalibration-Dsme5wxU.js";async function f(e){if(!e.type.startsWith(`image/`))throw Error(`Selecione um arquivo de imagem PNG, JPG ou WebP.`);if(`createImageBitmap`in globalThis){let t=await createImageBitmap(e),n={width:t.width,height:t.height};return t.close(),n}return p(e)}function p(e){return new Promise((t,n)=>{let r=URL.createObjectURL(e),i=new Image;i.onload=()=>{URL.revokeObjectURL(r),t({width:i.naturalWidth,height:i.naturalHeight})},i.onerror=()=>{URL.revokeObjectURL(r),n(Error(`Não foi possível ler as dimensões da imagem.`))},i.src=r})}async function m(t,r){if(await e.player.getRole()!==`GM`)throw Error(`Apenas o mestre pode importar e calibrar mapas.`);let i=await f(t),a=n(r,i.width,i.height),l=s(r),p={id:crypto.randomUUID(),mapId:r,fileName:t.name,imageWidth:i.width,imageHeight:i.height,kilometersPerImagePixel:a,kilometersPerDay:36,createdAt:new Date().toISOString()},m=u(t).name(l.uploadName).description(`Mapa de ${l.label} importado localmente para a Régua de Viagem.`).scale({x:1,y:1}).locked(!0).build(),h=d().name(l.sceneName).baseMap(m).thumbnail(t).gridOpacity(0).gridScale(`1km`).fogFilled(!1).build();c(p);try{return await e.assets.uploadScenes([h]),p}catch(e){throw o(p.id),e}}var h=document.querySelector(`#app`);if(!h)throw Error(`Elemento raiz do painel não encontrado.`);var g=h,_=`PLAYER`,v=null,y=!1,b=`Conectando ao Owlbear Rodeo…`,x=`info`;C(),e.isAvailable?e.onReady(()=>{S()}):(b=`Abra este painel dentro do Owlbear Rodeo. O servidor local serve apenas os arquivos da extensão.`,C());async function S(){try{_=await e.player.getRole(),v=await l(),v??=await i(),b=v?`Cena calibrada para ${v.mapLabel}.`:`Nenhuma calibração encontrada na cena atual.`,x=v?`success`:`info`}catch(e){O(e)}finally{C()}}function C(){let e=r.map(e=>{let t=s(e);return`
      <article class="card map-card">
        <div>
          <h2>${t.label}</h2>
          <p>Referência: ${t.referenceWidth}×${t.referenceHeight}px</p>
        </div>
        <div class="button-row">
          <label class="button primary ${y||_!==`GM`?`disabled`:``}">
            Importar mapa
            <input data-file-map="${e}" type="file" accept="image/png,image/jpeg,image/webp" ${y||_!==`GM`?`disabled`:``} />
          </label>
          <button data-calibrate-map="${e}" class="button secondary" ${y||_!==`GM`?`disabled`:``}>
            Calibrar cena atual
          </button>
        </div>
      </article>
    `}).join(``),t=v?`
      <section class="card calibration-card">
        <h2>Cena atual</h2>
        <dl>
          <div><dt>Mapa</dt><dd>${v.mapLabel}</dd></div>
          <div><dt>Imagem</dt><dd>${v.imageWidth}×${v.imageHeight}px</dd></div>
          <div><dt>Escala</dt><dd>${k(v.kilometersPerImagePixel,4)} km/pixel</dd></div>
        </dl>
        <form id="speed-form">
          <label for="speed">Quilômetros percorridos por dia</label>
          <div class="inline-field">
            <input id="speed" name="speed" type="number" min="0.1" step="0.1" value="${v.kilometersPerDay}" required ${y||_!==`GM`?`disabled`:``} />
            <button class="button primary" type="submit" ${y||_!==`GM`?`disabled`:``}>Salvar</button>
          </div>
        </form>
      </section>
    `:``;g.innerHTML=`
    <header>
      <h1>Régua de Viagem</h1>
      <p>Importe e calibre seus próprios mapas de Arton e Lamnor.</p>
    </header>
    <p class="status ${x}" role="status">${A(b)}</p>
    ${_===`PLAYER`?`<p class="notice">Somente o mestre importa mapas e altera a calibração. Jogadores também podem traçar e apagar rotas quando a sala permite criar e excluir itens da camada Régua.</p>`:``}
    <section class="map-list" aria-label="Mapas disponíveis">${e}</section>
    ${t}
    <p class="hint">Após importar, abra a cena criada no Atlas. A calibração será aplicada automaticamente.</p>
  `,w()}function w(){for(let e of g.querySelectorAll(`[data-file-map]`))e.addEventListener(`change`,()=>{let t=e.files?.[0],n=e.dataset.fileMap;t&&n&&T(t,n)});for(let e of g.querySelectorAll(`[data-calibrate-map]`))e.addEventListener(`click`,()=>{let t=e.dataset.calibrateMap;t&&E(t)});g.querySelector(`#speed-form`)?.addEventListener(`submit`,e=>{e.preventDefault();let t=new FormData(e.currentTarget);D(Number(t.get(`speed`)))})}async function T(e,t){y=!0,b=`Lendo ${e.name} e preparando a cena…`,x=`info`,C();try{let n=await m(e,t);b=`${s(t).label} importado (${n.imageWidth}×${n.imageHeight}px). Abra a nova cena no Atlas.`,x=`success`}catch(e){O(e)}finally{y=!1,C()}}async function E(e){y=!0,b=`Calibrando a cena atual como ${s(e).label}…`,x=`info`,C();try{v=await a(e),b=`Cena calibrada para ${v.mapLabel}.`,x=`success`}catch(e){O(e)}finally{y=!1,C()}}async function D(e){y=!0,C();try{v=await t(e),b=`Velocidade atualizada para ${k(e,1)} km por dia.`,x=`success`}catch(e){O(e)}finally{y=!1,C()}}function O(e){b=e instanceof Error?e.message:`Ocorreu um erro inesperado.`,x=`error`}function k(e,t){return new Intl.NumberFormat(`pt-BR`,{maximumFractionDigits:t}).format(e)}function A(e){return e.replace(/[&<>'"]/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,"'":`&#39;`,'"':`&quot;`})[e]??e)}