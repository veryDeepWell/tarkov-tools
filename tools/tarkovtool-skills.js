  function itemName(it){
    if(window.TarkovNames&&TarkovNames.display)return TarkovNames.display(it);
    if(!it)return '';
    if(typeof it==='string')return it;
    var s=String(itemName(it)||'').trim();
    if(/^[a-f0-9]{20,}$/i.test(s)) {
      var n=String(it.name||'').trim();
      var sl=String(it.normalizedName||'').trim();
      if(n && !/^[a-f0-9]{20,}$/i.test(n)) s=n;
      else if(sl) s=sl;
    }
    return s||it.id||'';
  }

    const SKILLS = [
      {
        id: 'strength', name: 'Strength', cat: 'Physical',
        tip: 'Перегруз в жёлтой зоне, прыжки, мили, гранаты.',
        cheese: 'Таскай тяжёлый рюкзак/лут почти каждый рейд. Не обязательно красный перегруз — жёлтого хватает. Гранаты и приклады в мили Scav — бонус.',
        soft: 'После 1–2 «порций» перегрузочного бега за рейд множитель падает. Лучше чуть-чуть каждый рейд, чем час AFK с кирпичами.'
      },
      {
        id: 'endurance', name: 'Endurance', cat: 'Physical',
        tip: 'Спринт и прыжки, задержка дыхания в ADS.',
        cheese: 'Лёгкий билд + длинные перебежки по карте. ADS + hold breath между спринтами. Не качается от стояния.',
        soft: 'Спринт «до отвала» в одном рейде быстро упирается в усталость навыка — чередуй с лутом.'
      },
      {
        id: 'vitality', name: 'Vitality', cat: 'Physical',
        tip: 'Получать урон и выживать; резисты к кровотечениям.',
        cheese: 'Обычные файты. Чиз: контролируемые падения / рикошеты, потом хил. Не суицид в голову.',
        soft: 'Много мелкого урона за рейд ≠ много XP после 1–2 очков.'
      },
      {
        id: 'health', name: 'Health', cat: 'Physical',
        tip: 'Хил медками; пассивный реген.',
        cheese: 'Классика: обжечься о костёр / получить тик урона → хилить аптечкой пачками. В схроне Grizzly после рейда тоже даёт прогресс по лечению. Дешёвые AI-2 / Car kit на чиз.',
        soft: 'Спам хила в одном сидении режется усталостью — лучше 1 серия хила за «волну», не 20 аптечек подряд без паузы.'
      },
      {
        id: 'metabolism', name: 'Metabolism', cat: 'Physical',
        tip: 'Еда и вода, эффекты провизии.',
        cheese: 'Ешь/пей в рейде (в убежище/схроне исторически слабее или криво отображается). Дешёвый чиз: вода/сухпай по чуть-чуть. Можно подновлять между вылазками, но основной XP — in-raid.',
        soft: 'Очень быстро ловит кап: несколько глотков/укусов → множитель падает. Пей не залпом всю бутылку, а «порцию», потом другое действие / ~пауза.'
      },
      {
        id: 'stress', name: 'Stress Resistance', cat: 'Physical',
        tip: 'Бой на низком HP, тремор/паника.',
        cheese: 'Оставаться в бою на красном HP (осознанно). Квесты ветки Survivalist дают уровни — не сдавай их на 0 скилла, если хочешь максимум от награды.',
        soft: 'Редко набивается пачкой — обычно 1 очко за жёсткий файд.'
      },
      {
        id: 'immunity', name: 'Immunity', cat: 'Physical',
        tip: 'Дебаффы от стимов/еды/ядов.',
        cheese: 'XP капает в конце дебаффа, не во время. Нужен предмет с минусом, который ты пережил до конца. Бюджетно: энергетик/дешёвая провизия с лёгким дебаффом; стимы с длинным хвостом (не обязательно Obdolbos за миллион). Не помирай и не выходи, пока дебафф не закончился — иначе очков нет. Метаболизм укорачивает дебаффы → меньше XP с иммунитета.',
        soft: 'Один «дожданный» дебафф за рейд эффективнее трёх прерванных.'
      },
      {
        id: 'magdrills', name: 'Mag Drills', cat: 'Practical',
        tip: 'Зарядка/разрядка магазинов.',
        cheese: 'В рейде: набивай/опустошай маг, пока бежишь между поинтами. В схроне тоже крутят, но анти-абуз и патчи меняли эффективность — надёжнее in-raid привычка.',
        soft: 'После пары «пачек» патронов за рейд XP на магазин режется — не сиди 10 минут на спавне.'
      },
      {
        id: 'search', name: 'Search', cat: 'Practical',
        tip: 'Обыск контейнеров и трупов.',
        cheese: 'Не скипай ящики и карманы. Attention рядом. Elite — два контейнера сразу.',
        soft: 'Массовый лут одного типа всё равно упрётся в кап очков за рейд.'
      },
      {
        id: 'attention', name: 'Attention', cat: 'Mental',
        tip: 'Поиск / осмотр, связан с Search.',
        cheese: 'Лутай осознанно, не только «быстрый лут» если качаешь.',
        soft: 'Как у Search — распределяй по рейдам.'
      },
      {
        id: 'perception', name: 'Perception', cat: 'Mental',
        tip: 'Слышимость, «игра ушами».',
        cheese: 'Естественный прогресс от движения и боёв. Отдельного дешёвого чиза почти нет.',
        soft: '—'
      },
      {
        id: 'covert', name: 'Covert Movement', cat: 'Practical',
        tip: 'Тихое движение <~25% скорости.',
        cheese: 'Зажми тихий шаг в опасных зонах (общаги, моллы). AFK-ходьба в углу карты — работает, но скучно и ловит кап.',
        soft: 'Долгий стрейф на 1% скорости в одном рейде быстро краснеет.'
      },
      {
        id: 'surgery', name: 'Surgery', cat: 'Practical',
        tip: 'CMS / Surv12 на чёрных конечностях.',
        cheese: 'Чиз в конце рейда: на выходе попросить тиммейта выбить ноги/руки → зашить CMS/Surv12 (и сразу хил до 1 HP+). Соло: прыжок с высоты / падение, чтобы почернить конечность, не убив грудь/голову. В Arena FFA некоторые качают пачкой CMS в сейфе — помни про усталость навыка. Elite: быстрее и с меньшим штрафом max HP.',
        soft: 'Сильный софт-кап: 1 (от силы 2) полноценные операции за рейд на навык. Пять CMS подряд ≈ первое очко жирное, остальное почти в мусорку.'
      },
      {
        id: 'aim', name: 'Aim Drills', cat: 'Combat',
        tip: 'ADS, удержание дыхания, стрельба с прицела.',
        cheese: 'Просто играй от ADS. Отдельный чиз почти не нужен.',
        soft: 'Качается медленно и «само».'
      },
      {
        id: 'recoil', name: 'Recoil Control', cat: 'Combat',
        tip: 'Очереди и контроль.',
        cheese: 'Бои, не стрельба в стену 10 минут (кап + скука).',
        soft: 'Как combat — лучше равномерно.'
      },
      {
        id: 'troubleshooting', name: 'Troubleshooting', cat: 'Combat',
        tip: 'Осечки / устранение неисправностей.',
        cheese: 'Грязное оружие / плохие патроны → разбор осечек. Редко стоит чизить специально.',
        soft: '—'
      },
      {
        id: 'crafting', name: 'Crafting', cat: 'Practical',
        tip: 'Время крафтов в убежище.',
        cheese: 'Держи станции занятыми. XP от суммарного времени крафта (не путать с Hideout Management). Library бустит Practical.',
        soft: 'Не рейдовый софт-кап, а долгий гринд часами крафта.'
      },
      {
        id: 'hidemgmt', name: 'Hideout Management', cat: 'Practical',
        tip: 'Крафты, апгрейды, топливо/фильтры.',
        cheese: 'Каждый завершённый цикл крафта + апгрейд модуля (жирный кусок) + жжёное топливо. См. инструмент «Качатель Hideout Management» — дешёвые циклы по станциям.',
        soft: 'Апгрейды — разовые. Дальше — поток крафтов, не один дорогой за день.'
      }
    ];

    const CAT_CLASS = { Physical: 'phys', Practical: 'prac', Combat: 'combat', Mental: 'mental' };

    function esc(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function load() {
      try { return JSON.parse(localStorage.getItem('tarkovSkillLevels') || '{}'); }
      catch { return {}; }
    }

    function render() {
      const st = load();
      const el = document.getElementById('skillList');
      el.innerHTML = '';
      SKILLS.forEach(sk => {
        const div = document.createElement('div');
        div.className = 'skill-row';
        div.innerHTML = `
          <div>
            <div class="name">${esc(sk.name)}</div>
            <span class="tag ${CAT_CLASS[sk.cat] || ''}">${esc(sk.cat)}</span>
          </div>
          <label class="meta">ур.<br><input type="number" min="0" max="51" data-id="${esc(sk.id)}" value="${st[sk.id] ?? 0}"></label>
          <div></div>
          <div>
            <div class="meta">${esc(sk.tip)}</div>
            <div class="cheese"><b>Чиз:</b> ${esc(sk.cheese)}</div>
            <div class="soft"><strong>Софт-кап:</strong> ${esc(sk.soft)}</div>
          </div>`;
        el.appendChild(div);
      });
    }

    document.getElementById('saveSkills').onclick = () => {
      const st = {};
      document.querySelectorAll('#skillList input[data-id]').forEach(inp => {
        st[inp.dataset.id] = Number(inp.value) || 0;
      });
      localStorage.setItem('tarkovSkillLevels', JSON.stringify(st));
      alert('Сохранено');
    };
    document.getElementById('resetSkills').onclick = () => {
      if (!confirm('Сбросить все уровни в трекере?')) return;
      localStorage.removeItem('tarkovSkillLevels');
      render();
    };

    render();
  