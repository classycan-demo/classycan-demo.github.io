/**
 * CLASSyCAN - Dynamic Curriculum Data Layer
 * Loads and parses unit data directly from src/data/unit1.json (or specified JSON path),
 * rather than relying on hard-coded curriculum objects.
 */

(function() {
  // Helper: Normalize file paths from unit1.json (Windows backslashes to web URLs)
  function normalizeAssetPath(rawPath, fallback = '') {
    if (!rawPath || rawPath === '/' || rawPath === '\\') {
      return fallback;
    }
    let cleaned = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!cleaned.startsWith('public/')) {
      cleaned = 'public/' + cleaned;
    }
    return cleaned;
  }

  // Parse Chinese word and Jyutping from "名稱 jyut6 ping3"
  function parseWordAndJyutping(str) {
    if (!str) return { name: '', jyutping: '' };
    const trimmed = str.trim();
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) {
      return { name: trimmed, jyutping: '' };
    }
    return {
      name: trimmed.substring(0, spaceIdx).trim(),
      jyutping: trimmed.substring(spaceIdx + 1).trim()
    };
  }

  // Parse Classifiers from Task 5 remarks
  function parseClassifiers(remarksText) {
    const defaultClassifiers = [
      { id: 1, classifier: "籠 lung4", target: "燒賣", example: "一籠燒賣" },
      { id: 2, classifier: "盅 zung1", target: "茶 / 兩件", example: "一盅兩件" },
      { id: 3, classifier: "碟 dip6", target: "蝦腸", example: "一碟蝦腸" },
      { id: 4, classifier: "件 gin6", target: "雞扎", example: "一件雞扎" },
      { id: 5, classifier: "粒 nap1", target: "牛肉球", example: "一粒牛肉球" },
      { id: 6, classifier: "隻 zek3", target: "鹹水角", example: "一隻鹹水角" },
      { id: 7, classifier: "嚿 gau6", target: "叉燒", example: "一嚿叉燒" },
      { id: 8, classifier: "車 ce1", target: "點心", example: "一車點心" },
      { id: 9, classifier: "餐 caan1", target: "飯", example: "一餐飯" },
      { id: 10, classifier: "檯 toi2", target: "客", example: "一檯客" }
    ];

    if (!remarksText) return defaultClassifiers;

    const list = [];
    // Matches like "1. 籠 lung4 （一籠燒賣）" or "4. 件（一件雞扎）"
    const regex = /(\d+)\.\s*([^\s（]+)(?:\s+([a-zA-Z0-9]+))?\s*（([^）]+)）/g;
    let match;
    while ((match = regex.exec(remarksText)) !== null) {
      const id = parseInt(match[1], 10);
      const char = match[2];
      const jp = match[3] || (char === '件' ? 'gin6' : '');
      const example = match[4];
      const target = example.replace(/^一[^\u4e00-\u9fa5]*[\u4e00-\u9fa5]/, '') || example;
      list.push({
        id,
        classifier: jp ? `${char} ${jp}` : char,
        target: target || example,
        example
      });
    }

    return list.length > 0 ? list : defaultClassifiers;
  }

  // Parse Sauces and Tea-芥 from Task 6 remarks
  function parseSauces(remarksText) {
    const defaultSauces = [
      {
        name: "豉油",
        jyutping: "si6 jau4",
        image: "public/unit1/image/si6jau4.png",
        audio: "public/unit1/audio/_unit1_task6_audio_si6jau4.mp3"
      },
      {
        name: "喼汁",
        jyutping: "gip1 zap1",
        image: "public/unit1/image/gip1zap1.png",
        audio: "public/unit1/audio/_unit1_task6_audio_gip1zap1.mp3"
      },
      {
        name: "蠔油",
        jyutping: "hou4 jau4",
        image: "public/unit1/image/hou4jau4.png",
        audio: "public/unit1/audio/_unit1_task6_audio_hou4jau4.mp3"
      },
      {
        name: "XO醬",
        jyutping: "XO zoeng3",
        image: "public/unit1/image/xozoeng3.png",
        audio: "public/unit1/audio/_unit1_task6_audio_xozoeng3.mp3"
      },
      {
        name: "辣椒醬",
        jyutping: "laat6 ziu1 zoeng3",
        image: "public/unit1/image/laat6ziu1zoeng3.png",
        audio: "public/unit1/audio/_unit1_task6_audio_laat6ziu1zoeng3.mp3"
      },
      {
        name: "辣椒油",
        jyutping: "laat6 ziu1 jau4",
        image: "public/unit1/image/laat6ziu1jau4.png",
        audio: "public/unit1/audio/_unit1_task6_audio_laat6ziu1jau4.mp3"
      },
      {
        name: "黃芥末醬",
        jyutping: "wong4 gaai3 mut6 zoeng3",
        image: "public/unit1/image/wong4gaai3mut6zoeng3.png",
        audio: "public/unit1/audio/_unit1_task6_audio_wong4gaai3mut6zoeng3.mp3"
      },
      {
        name: "蝦醬",
        jyutping: "haa1 zoeng3",
        image: "public/unit1/image/蝦醬-T1-Act-1-sauce.png",
        audio: ""
      }
    ];

    let story = "舊時嘅茶樓會預先提供「芥、醬」包括辣椒醬和芥末醬，所以現在的收費有一項就「茶芥」就是這個意思！";

    if (remarksText) {
      const storyMatch = remarksText.match(/【茶芥：([^】]+)】/);
      if (storyMatch) {
        story = storyMatch[1];
      }
    }

    return {
      sauces: defaultSauces,
      story
    };
  }

  // Convert raw array from unit1.json into structured application dataset
  function transformUnitJson(rawList) {
    if (!Array.isArray(rawList)) {
      throw new Error("Invalid unit data: expected JSON array");
    }

    // 1. Module 1: Reading Article / Culture Story (task: "1")
    const storyItem = rawList.find(item => item.task === '1' || item.task_type === '文章閱讀') || {};
    const storyTitle = storyItem.title || "茶樓文化嘅故事";
    const storyBody = storyItem.body || "";
    const storyAudio = normalizeAssetPath(storyItem.audio_path, 'public/unit1/audio/_unit1_task2_audio_pou2lei2.mp3');
    const storyImage = normalizeAssetPath(storyItem.image_path, 'public/unit1/image/T1茶樓背景圖.jpg');

    // High quality Mandarin translation of the cultural story for bilingual learning
    const mandarinTranslation = `一到週末假日，爺爺奶奶就最喜歡帶著全家大小到茶樓喝早茶，這個習慣已經是我們香港文化的一部分。

所謂的「茶樓」，最早只是為勞動工人提供「一盅兩件」（一壺茶配兩籠點心）的地方。茶樓分「早市」和「晚市」。過去早市會有服務員推著「點心手推車」巡迴走動，客人看到喜歡的就伸手拿取；現在多數是用點心單勾選自己想吃的點心，蝦餃、燒賣這些經典點心依舊人氣不減。

晚市則多數做宴席與海鮮熱炒。茶樓裡有各種不同的座位：想安靜、隱私度高一點的可以選「包廂」（獨立房間）；但最能體現傳統人情味的莫過於「併桌（搭檯）」，幾家人坐同一張大圓桌，雖然互不相識，但能一起品茶、享用點心聊天。逢年過節，好似農曆新年或者中秋節，茶樓裡總是水滾茶香、人山人海。喝茶時，別人替你倒茶，記得用食指與中指在桌上輕敲扣指謝茶，這個禮節非常重要。因此，去茶樓不只是用餐，更是體驗香港人深刻的社交人情文化。`;

    // Hotspots configured around the story elements in T1茶樓背景圖.jpg / lin4hoeng1lau4_scene.jpg (574x360 coordinates)
    const hotspots = [
      {
        id: "hotspot_story",
        px_x: 135,
        px_y: 48,
        x: 23.5,
        y: 13.3,
        title: "蓮香樓與茶樓文化",
        tag: "茶樓歷史故事",
        badge: "文化故事",
        icon: "🫖",
        image: "public/unit1/image/T1茶樓背景圖.jpg",
        summary: "所謂嘅「茶樓」，最初只係為勞動工人提供「一盅兩件」（一壺茶同兩籠點心）嘅地方。每逢假日，一家大細都鍾意去茶樓嘆早茶！",
        fullStory: storyBody,
        mandarinTranslation,
        audioText: "一到假日，公公婆婆就最鍾意帶住一家大細到茶樓飲早茶，呢個習慣已經係我哋香港文化嘅一部分。",
        audioFile: "public/unit1/audio/_unit1_task7_audio_homhojibongngohoiwupounei.mp3"
      },
      {
        id: "hotspot_finger_tap",
        px_x: 168,
        px_y: 188,
        x: 29.3,
        y: 52.2,
        title: "斟茶與叩手禮",
        tag: "重要飲茶社交禮儀",
        badge: "社交禮儀",
        icon: "🍵",
        image: "public/unit1/image/菊花茶-T1-Act1-茶葉-gukfaacaa.png",
        summary: "喺茶樓，斟茶同叩手係表達感謝嘅禮儀。茶水斟滿，點心到面前，輕敲枱面三下，向點心部同侍應話「多謝」。一齊聽下點樣講同點樣做啦！",
        fullStory: `飲茶嗰陣，人哋幫你斟茶或者倒水，千祈唔好只係坐喺度望住！

香港人習慣用食指同中指彎曲，喺檯面上輕輕「叩三下」，呢個動作叫做「叩手禮」或者「叩指謝茶」。

相傳清代乾隆皇帝微服下江南，去到茶館親自幫隨行的太監斟茶。太監不敢當面行三跪九叩大禮洩露天機，靈機一動便用兩隻手指彎曲叩桌，代表雙膝下跪扣頭謝恩。這個趣味禮儀一直流傳到今日，成為香港茶樓人人必備的人情社交密碼！`,
        mandarinTranslation: `喝茶的時候，別人幫你倒茶或加水，千萬不要只坐在那裡看著！香港人習慣將食指與中指微屈在桌面上輕輕「敲扣三下」表示叩謝。`,
        audioText: "麻煩你幫我加水吖",
        audioFile: "public/unit1/audio/_unit1_task7_audio_bongngogaaseoiaamaafaannei.mp3"
      },
      {
        id: "hotspot_dimsum_cart",
        px_x: 362,
        px_y: 148,
        x: 63.1,
        y: 41.1,
        title: "點心車與點心姐姐",
        tag: "經典茶樓巡迴",
        badge: "懷舊文化",
        icon: "🛒",
        image: "public/unit1/image/caa1siu1baau1.png",
        summary: "以前茶樓早市會有點心姐姐推住點心車，車上放滿熱辣辣嘅蒸籠，沿途叫賣！",
        fullStory: `「蝦餃、燒賣、叉燒包，熱辣辣！」以前早市最熱鬧嘅風景，就係「點心姐姐」推住載滿鐵蒸籠嘅點心車，穿梭喺一張張大圓檯之間。

客人想食咩，就招手叫住點心姐姐，遞上自己檯嘅「點心紙」。點心姐姐掀開木蒸籠蓋，蒸氣騰騰，夾出你要嘅點心，再喺點心紙上面嘅印章欄蓋一個小章（例如大點、中點、特點）。依家雖然多數茶樓改為手寫劃單，但蓮香樓呢類傳統老茶樓依然保留住推車文化！`,
        mandarinTranslation: `過去茶樓最熱鬧的景象，就是服務員推著擺滿蒸籠的點心手推車穿梭於桌間，想吃什麼只要招手取餐並蓋印章。`,
        audioText: "燒賣 siu1 maai2",
        audioFile: "public/unit1/audio/_unit1_task3_audio_siu1maai2.mp3"
      },
      {
        id: "hotspot_daap_toi",
        px_x: 432,
        px_y: 232,
        x: 75.3,
        y: 64.4,
        title: "搭檯（併桌文化）",
        tag: "舊時人情味",
        badge: "香港在地特色",
        icon: "👥",
        image: "public/unit1/image/siu1maai2.png",
        summary: "茶樓人山人海，幾家人坐埋同一張檯，雖然陌生，但可以一齊飲茶嘆點心！",
        fullStory: `去到茶樓如果見到滿座，部長或者侍應會問你：「兩位呀？搭檯得唔得？」

所謂「搭檯」，就係素未謀面嘅陌生人坐在同一張大圓檯上。大家坐埋同一張檯，各自睇報紙、飲茶、嘆點心，有時仲會傾下時事、吹下水。呢種自然、緊密嘅相處方式，正正係香港茶樓最深厚嘅人情味體現。`,
        mandarinTranslation: `在人潮眾多的香港茶樓，互不相識的客人坐在同一張大圓桌共用餐點，稱之為「搭檯（併桌）」，是極具特色的生活人情味。`,
        audioText: "可唔可以加多set碗碟",
        audioFile: "public/unit1/audio/_unit1_task7_audio_homhojigaadosetwundip.mp3"
      }
    ];

    // 2. Module 2: Teas (task: "2") + Teahouse Requests & Staff Titles (task: "7")
    const teaNotes = {
      "普洱": "茶性溫和，濃醇去油膩，香港飲茶點茶率第一名。",
      "壽眉": "白茶的一種，茶味清淡甘甜，香氣淡雅。",
      "鐵觀音": "烏龍茶類，茶香高昂持久，回甘強烈。",
      "烏龍茶": "半發酵茶，溫潤順喉，茶味清潤。",
      "菊花": "清肝明目，常與普洱調和為「菊普」。",
      "水仙": "香氣撲鼻，帶有天然蘭花香氣。"
    };

    const teaDefaultAudio = {
      "壽眉": "public/unit1/audio/_unit1_task2_audio_sau6mei2.mp3",
      "普洱": "public/unit1/audio/_unit1_task2_audio_pou2lei2.mp3",
      "鐵觀音": "public/unit1/audio/_unit1_task2_audio_tit3gun1jam1.mp3",
      "烏龍茶": "public/unit1/audio/_unit1_task2_audio_wu1lung2.mp3",
      "菊花": "public/unit1/audio/_unit1_task2_audio_guk1faa1.mp3",
      "水仙": "public/unit1/audio/_unit1_task2_audio_seoi2sin1.mp3"
    };

    const teaDefaultImage = {
      "菊花": "public/unit1/image/菊花茶-T1-Act1-茶葉-gukfaacaa.png"
    };

    const teaRaw = rawList.filter(item => item.task === '2' && item.body);
    const teaList = teaRaw.map(item => {
      const parsed = parseWordAndJyutping(item.body);
      const audio = normalizeAssetPath(item.audio_path) || teaDefaultAudio[parsed.name] || '';
      const image = normalizeAssetPath(item.image_path) || teaDefaultImage[parsed.name] || '';
      return {
        name: parsed.name,
        jyutping: parsed.jyutping,
        audio,
        image,
        note: teaNotes[parsed.name] || "茶樓經典名茶，茶香四溢。"
      };
    });

    // Task 7: Staff Titles & Making Requests in the Teahouse
    const staffTitles = [
      { name: "伙記", jyutping: "fo2 gei3", role: "一般侍應", audio: "public/unit1/audio/_unit1_task7_audio_fo2gei3.mp3" },
      { name: "靚仔", jyutping: "leng3 zai2", role: "男侍應", audio: "public/unit1/audio/_unit1_task7_audio_leng3zai2.mp3" },
      { name: "靚女", jyutping: "leng3 neoi2", role: "女侍應／點心姐姐", audio: "public/unit1/audio/_unit1_task7_audio_leng3neoi2.mp3" },
      { name: "哥仔", jyutping: "go1 zai2", role: "年輕男侍應", audio: "public/unit1/audio/_unit1_task7_audio_go1zai2.mp3" },
      { name: "哥哥", jyutping: "go4 go1", role: "男經理／男侍應", audio: "public/unit1/audio/_unit1_task7_audio_go4go1.mp3" },
      { name: "阿姐", jyutping: "aa3 ze1", role: "資深女侍應／點心阿姐", audio: "public/unit1/audio/_unit1_task7_audio_aa3ze1.mp3" },
      { name: "姐姐", jyutping: "ze4 ze1", role: "女經理／女侍應", audio: "public/unit1/audio/_unit1_task7_audio_ze4ze1.mp3" }
    ];

    const requestPhrases = [
      { pattern: "麻煩你...", text: "麻煩你幫我加水吖", meaning: "請幫我加熱水", audio: "public/unit1/audio/_unit1_task7_audio_bongngogaaseoiaamaafaannei.mp3" },
      { pattern: "麻煩...", text: "麻煩落多啲豉油", meaning: "請多加一點醬油", audio: "public/unit1/audio/_unit1_task7_audio_maafaanlokdodisijau.mp3" },
      { pattern: "麻煩你...", text: "麻煩你畀個外賣盒我", meaning: "請給我一個打包盒", audio: "public/unit1/audio/_unit1_task7_audio_maafaanneibeigongoimaaihapngo.mp3" },
      { pattern: "可唔可以...", text: "可唔可以幫我開壺普洱", meaning: "能不能幫我泡一壺普洱茶", audio: "public/unit1/audio/_unit1_task7_audio_homhojibongngohoiwupounei.mp3" },
      { pattern: "可唔可以...", text: "可唔可以幫我換過隻碟", meaning: "能不能幫我換一個盤子", audio: "public/unit1/audio/_unit1_task7_audio_homhojibongngowungwozekdip.mp3" },
      { pattern: "可唔可以...", text: "可唔可以幫我收走呢set碗碟", meaning: "能不能幫我收走這套碗盤", audio: "public/unit1/audio/_unit1_task7_audio_homhojibongngosauzaunisetwundip.mp3" },
      { pattern: "可唔可以...", text: "可唔可以加多set碗碟", meaning: "能不能多加一套碗盤", audio: "public/unit1/audio/_unit1_task7_audio_homhojigaadosetwundip.mp3" },
      { pattern: "唔該...", text: "唔該你，點心紙寫好喇", meaning: "勞駕，點心單已經填好了", audio: "public/unit1/audio/_unit1_task7_audio_mgoinei，dimsamzisehoulaa.mp3" },
      { pattern: "唔該...", text: "唔使落喼汁㗎喇，唔該", meaning: "不用加伍斯特醋（喼汁）了，謝謝", audio: "public/unit1/audio/_unit1_task7_audio_msailokgipzapgaalaa，mgoi.mp3" },
      { pattern: "唔該...", text: "唔該，想埋單", meaning: "勞駕，我想結帳", audio: "public/unit1/audio/_unit1_task7_audio_mgoi，soengmaaidaan.mp3" }
    ];

    // 3. Module 3: Dim Sum (task: "3"), Sauces (task: "6"), & Food Textures (Act 3)
    const dimSumMap = new Map();
    const dimSumDescriptions = {
      "燒賣": "經典蒸點，金黃外皮包著豬肉與鮮蝦，頂部綴以蟹籽。",
      "鮮蝦腸粉": "粉皮晶瑩嫩滑，裹入鮮甜大蝦，淋上甜豉油絕配。",
      "牛肉球": "牛肉肉質彈牙嫩滑，混合芫荽蔥香，底下墊有腐竹吸汁。",
      "潮州粉果": "晶瑩通透粉皮，包裹炒香花生、韭菜、豬肉碎，口感爽脆。",
      "排骨": "精選一字排骨加入陽江豆豉與蒜蓉，肉質滑嫩多汁。",
      "雞扎": "以腐皮捲起滑嫩雞肉、花膠或魚肚、冬菇，鮮香入味。",
      "炸雲吞": "炸至金黃酥脆，皮脆餡鮮，蘸酸甜錦鹵汁更是經典。",
      "炸兩": "滑嫩腸粉緊緊包裹著剛炸起香脆油炸鬼，外滑內脆。",
      "鮮竹卷": "腐竹包著木耳、筍絲與鮮蝦，淋上特製蠔油高湯蒸製。",
      "鳳爪": "先炸後燜，入口即化，豉香微辣，軟爛入味。",
      "蘿蔔糕": "清甜白蘿蔔絲混合臘味與蝦米，煎香後外脆內軟。",
      "奶黃包": "熱騰騰白麵包皮，撕開金黃蛋黃流沙如泉湧，甜而不膩。",
      "鹹水角": "外層炸至金黃酥脆微甜，內餡鹹香多汁，口感層次豐富。",
      "珍珠雞": "荷葉包裹著軟糯糯米，內有雞肉、冬菇與鹹蛋黃香氣濃郁。",
      "芝麻糊": "傳統中式石磨糖水，黑芝麻香氣馥郁，順滑香濃。",
      "叉燒包": "鬆軟雪白包皮裂開微露蜜汁叉燒餡，鹹甜交融。"
    };

    const dimSumImageFallbacks = {
      "燒賣": "public/unit1/image/siu1maai2.png",
      "鮮蝦腸粉": "public/unit1/image/sin1haa1coeng2fan2.png",
      "牛肉球": "public/unit1/image/ngau4juk6kau4.png",
      "潮州粉果": "public/unit1/image/ciu4zau1fan2gwo2.png",
      "排骨": "public/unit1/image/paai4gwat1.png",
      "雞扎": "public/unit1/image/gai1zaat3.png",
      "炸雲吞": "public/unit1/image/zaa3wan4tan1.png",
      "炸兩": "public/unit1/image/zaa3loeng2.png",
      "鮮竹卷": "public/unit1/image/sin1zuk1gyun2.png",
      "鳳爪": "public/unit1/image/fung6zaau2.png",
      "蘿蔔糕": "public/unit1/image/lo4baak6gou1.png",
      "奶黃包": "public/unit1/image/naai5wong4baau1.png",
      "鹹水角": "public/unit1/image/haam4seoi2gok3.png",
      "珍珠雞": "public/unit1/image/zan1zyu1gai1.png",
      "芝麻糊": "public/unit1/image/zi1maa4wu2.png",
      "叉燒包": "public/unit1/image/caa1siu1baau1.png"
    };

    const dimSumAudioFallbacks = {
      "燒賣": "public/unit1/audio/_unit1_task3_audio_siu1maai2.mp3",
      "鮮蝦腸粉": "public/unit1/audio/_unit1_task3_audio_sin1haa1coeng2fan2.mp3",
      "牛肉球": "public/unit1/audio/_unit1_task3_audio_ngau4juk6kau4.mp3",
      "潮州粉果": "public/unit1/audio/_unit1_task3_audio_ciu4zau1fan2gwo2.mp3",
      "排骨": "public/unit1/audio/_unit1_task3_audio_paai4gwat1.mp3",
      "雞扎": "public/unit1/audio/_unit1_task3_audio_gai1zaat3.mp3",
      "炸雲吞": "public/unit1/audio/_unit1_task3_audio_zaa3wan4tan1.mp3",
      "炸兩": "public/unit1/audio/_unit1_task3_audio_zaa3loeng2.mp3",
      "鮮竹卷": "public/unit1/audio/_unit1_task3_audio_sin1zuk1gyun2.mp3",
      "鳳爪": "public/unit1/audio/_unit1_task3_audio_fung6zaau2.mp3",
      "蘿蔔糕": "public/unit1/audio/_unit1_task3_audio_lo4baak6gou1.mp3",
      "奶黃包": "public/unit1/audio/_unit1_task3_audio_naai5wong4baau1.mp3",
      "鹹水角": "public/unit1/audio/_unit1_task3_audio_haam4seoi2gok3.mp3",
      "珍珠雞": "public/unit1/audio/_unit1_task3_audio_zan1zyu1gai1.mp3",
      "芝麻糊": "public/unit1/audio/_unit1_task3_audio_zi1maa4wu2.mp3"
    };

    const dimSumClassifiers = {
      "燒賣": "籠 lung4",
      "鮮蝦腸粉": "碟 dip6",
      "牛肉球": "粒 nap1 / 碟 dip6",
      "潮州粉果": "隻 zek3",
      "排骨": "碟 dip6",
      "雞扎": "件 gin6",
      "炸雲吞": "碟 dip6 / 隻 zek3",
      "炸兩": "條 tiu4 / 碟 dip6",
      "鮮竹卷": "條 tiu4 / 碟 dip6",
      "鳳爪": "碟 dip6",
      "蘿蔔糕": "件 gin6 / 碟 dip6",
      "奶黃包": "個 go3 / 籠 lung4",
      "鹹水角": "隻 zek3",
      "珍珠雞": "隻 zek3 / 件 gin6",
      "芝麻糊": "碗 wun2",
      "叉燒包": "個 go3 / 籠 lung4"
    };

    const dimSumRaw = rawList.filter(item => item.task === '3' && item.body);
    dimSumRaw.forEach(item => {
      const parsed = parseWordAndJyutping(item.body);
      const name = parsed.name;
      if (!name) return;

      if (!dimSumMap.has(name)) {
        dimSumMap.set(name, {
          id: name,
          name,
          jyutping: parsed.jyutping,
          image: dimSumImageFallbacks[name] || `public/unit1/image/${name}.png`,
          audio: dimSumAudioFallbacks[name] || '',
          classifier: dimSumClassifiers[name] || '碟 dip6',
          description: dimSumDescriptions[name] || '傳統茶樓點心。'
        });
      }

      const existing = dimSumMap.get(name);
      if (item.image_path) {
        let img = normalizeAssetPath(item.image_path);
        img = img.replace(/\.jpe?g$/, '.png');
        existing.image = img;
      }
      if (item.audio_path) {
        existing.audio = normalizeAssetPath(item.audio_path);
      }
    });

    const dimsumList = Array.from(dimSumMap.values());

    // Task 6: Sauces & Tea Fee
    const sauceItem = rawList.find(item => item.task === '6') || {};
    const { sauces: sauceList, story: teaFeeStory } = parseSauces(sauceItem.remarks);

    // Act 3 / Task 10: Food Review & Texture Vocabulary (10 recorded audio files)
    const textureList = [
      { name: "煙韌", jyutping: "jin1 ngan6", meaning: "Q彈有嚼勁（如粉果皮、糯米）", audio: "public/unit1/audio/煙韌.mp3" },
      { name: "爽口", jyutping: "song2 hau2", meaning: "爽脆清新（如鮮蝦、筍粒）", audio: "public/unit1/audio/爽口.mp3" },
      { name: "彈牙", jyutping: "daan6 ngaa4", meaning: "富彈性有咬口（如牛肉球、燒賣）", audio: "public/unit1/audio/彈牙.mp3" },
      { name: "唔黐牙", jyutping: "m4 ci1 ngaa4", meaning: "不黏牙（如靚蘿蔔糕、鹹水角）", audio: "public/unit1/audio/唔黐牙.mp3" },
      { name: "嫩滑", jyutping: "nyun6 waat6", meaning: "滑嫩順口（如鮮蝦腸粉、蒸排骨）", audio: "public/unit1/audio/嫩滑.mp3" },
      { name: "酥脆", jyutping: "sou1 ceoi3", meaning: "香酥鬆脆（如炸雲吞、炸兩）", audio: "public/unit1/audio/酥脆.mp3" },
      { name: "入味", jyutping: "jap6 mei6", meaning: "醬汁吸收透徹（如豉汁鳳爪、雞扎）", audio: "public/unit1/audio/入味.mp3" },
      { name: "軟綿綿", jyutping: "jyun5 min4 min4", meaning: "鬆軟綿密（如奶黃包、叉燒包）", audio: "public/unit1/audio/軟綿綿.mp3" },
      { name: "熱辣辣", jyutping: "jit6 laat1 laat1", meaning: "熱騰騰剛出籠", audio: "public/unit1/audio/熱辣辣.mp3" },
      { name: "惹味", jyutping: "je5 mei6", meaning: "香氣濃郁開胃（如XO醬炒蘿蔔糕）", audio: "public/unit1/audio/惹味.mp3" }
    ];

    // 4. Module 4: Dim Sum Paper (task: "4"), Classifiers (task: "5"), Bill & Currency (Act 2)
    const paperItems = rawList.filter(item => item.task === '4');
    const orderingPaper = {
      front: paperItems[0] ? normalizeAssetPath(paperItems[0].image_path).replace(/\.png$/, '.jpg') : 'public/unit1/image/dim2sum1zi2_a.jpg',
      back: paperItems[1] ? normalizeAssetPath(paperItems[1].image_path).replace(/\.png$/, '.jpg') : 'public/unit1/image/dim2sum1zi2_b.jpg'
    };

    const classifierItem = rawList.find(item => item.task === '5') || {};
    const classifierList = parseClassifiers(classifierItem.remarks);

    const classifierPairs = classifierList.slice(0, 6).map(item => ({
      target: item.target,
      correctClassifier: item.classifier,
      example: item.example
    }));

    const reduplicationPhrases = [
      { reduplication: "嚿嚿 / 碟碟 / 件件 / 粒粒 / 隻隻", sentence: "都咁好食", meaning: "每一件、每一碟都一樣咁美味" },
      { reduplication: "檯檯", sentence: "都坐滿人", meaning: "每張檯都座無虛席" },
      { reduplication: "餐餐", sentence: "都係你請", meaning: "每次食飯都係你請客" }
    ];

    const currencyList = [
      {
        name: "十蚊紙（十元紙幣）",
        slang: "十蚊雞 sap6 man1 gai1",
        jyutping: "sap6 man1",
        image: "public/unit1/image/十元紙幣-T1-Act2-sapjyunzibai.png",
        note: "香港俗稱「蚊」代表「元」，十元亦常叫「十蚊雞」。"
      },
      {
        name: "一蚊銀（一元硬幣）",
        slang: "一蚊雞 jat1 man1 gai1",
        jyutping: "jat1 man1",
        image: "public/unit1/image/一元硬幣-圖T1-Act2-jatjyunngaangbai.png",
        note: "一元硬幣俗稱「一蚊銀」或「一蚊雞」。"
      },
      {
        name: "五毫子（五角硬幣）",
        slang: "半蚊 bun3 man1 / 五毫 ng5 hou4",
        jyutping: "ng5 hou4 zi2",
        image: "public/unit1/image/五毫子-圖T1-Act2-cin-nghouzi.png",
        note: "「毫」即「角」，例如 $3.5 讀作「三個半（saam1 go3 bun3）」。"
      }
    ];

    const billComics = {
      primary: "public/unit1/image/comic_settle_bill.jpg",
      secondary: "public/unit1/image/bg-act2.jpeg",
      audio: "public/unit1/audio/_unit1_task7_audio_mgoi，soengmaaidaan.mp3"
    };

    // Assemble the 4 Modules
    const modules = [
      {
        id: "module1",
        number: 1,
        title: "入茶樓：茶樓文化",
        taskName: storyTitle,
        status: "active",
        statusLabel: "探索中",
        icon: "🫖",
        sceneBg: "public/unit1/image/T1茶樓背景圖.jpg",
        hotspots
      },
      {
        id: "module2",
        number: 2,
        title: "搵位坐：茶樓座位與茶葉",
        taskName: "茶葉與茶樓請求",
        status: "locked",
        statusLabel: "茶葉品茗",
        icon: "🪑",
        sceneBg: "public/unit1/image/T1茶樓背景圖.jpg",
        teas: teaList,
        staffTitles,
        requestPhrases
      },
      {
        id: "module3",
        number: 3,
        title: "開餐喇：點心與醬料",
        taskName: "點心、茶芥與口感",
        status: "locked",
        statusLabel: "點心探索",
        icon: "🥟",
        sceneBg: "public/unit1/image/T1茶樓背景圖.jpg",
        dimsum: dimsumList,
        sauces: sauceList,
        textures: textureList,
        teaFeeStory
      },
      {
        id: "module4",
        number: 4,
        title: "點幾多？：粵語量詞與點心紙",
        taskName: "量詞、點心紙與埋單",
        status: "locked",
        statusLabel: "實戰挑戰",
        icon: "📋",
        sceneBg: "public/unit1/image/T1茶樓背景圖.jpg",
        orderingPaper,
        classifiers: classifierList,
        classifierPairs,
        reduplicationPhrases,
        currencyList,
        billComics
      }
    ];

    return {
      source: "src/data/unit1.json",
      themeId: "theme1",
      themeTitle: "今日去飲茶",
      themeSubtitle: "探索香港茶樓，學習文化、詞彙與實用句式",
      modules,
      story: {
        title: storyTitle,
        cantoneseBody: storyBody,
        mandarinBody: mandarinTranslation,
        audio: storyAudio,
        image: storyImage
      },
      teaList,
      staffTitles,
      requestPhrases,
      dimsumList,
      sauceList,
      textureList,
      teaFeeStory,
      orderingPaper,
      classifierList,
      classifierPairs,
      reduplicationPhrases,
      currencyList,
      billComics,
      raw: rawList
    };
  }

  // Define global CLASSYCAN_DATA object with load capability
  window.CLASSYCAN_DATA = {
    isLoaded: false,
    jsonPath: 'src/data/unit1.json',
    modules: [],
    dimsumList: [],
    teaList: [],
    staffTitles: [],
    requestPhrases: [],
    sauceList: [],
    textureList: [],
    classifierPairs: [],
    classifierList: [],
    reduplicationPhrases: [],
    currencyList: [],
    billComics: {},
    orderingPaper: {},

    /**
     * Loads and parses curriculum data from unit1.json
     * @param {string} url Path to the unit1.json data file
     */
    async load(url = 'src/data/unit1.json') {
      this.jsonPath = url;
      console.log(`[CLASSyCAN] Loading curriculum dataset from ${url}...`);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: HTTP status ${response.status}`);
        }
        const rawJson = await response.json();
        const parsed = transformUnitJson(rawJson);
        Object.assign(this, parsed);
        this.isLoaded = true;
        console.log(`[CLASSyCAN] Data loaded successfully from ${url}! Parsed ${parsed.dimsumList.length} dim sum items, ${parsed.teaList.length} tea types, ${parsed.classifierList.length} classifiers.`);
        return this;
      } catch (err) {
        console.warn(`[CLASSyCAN] fetch('${url}') could not complete directly (e.g. local file:// protocol CORS restriction):`, err);
        
        // Attempt fallback from inline fallback script tag if present
        const embeddedEl = document.getElementById('unit-raw-json-data');
        if (embeddedEl && embeddedEl.textContent.trim()) {
          try {
            const rawJson = JSON.parse(embeddedEl.textContent);
            const parsed = transformUnitJson(rawJson);
            Object.assign(this, parsed);
            this.isLoaded = true;
            console.log(`[CLASSyCAN] Loaded data from embedded JSON script fallback.`);
            return this;
          } catch (e2) {
            console.error('[CLASSyCAN] Failed to parse embedded fallback data:', e2);
          }
        }

        throw err;
      }
    }
  };
})();
