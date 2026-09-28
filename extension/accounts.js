// trust: 0–100 (higher = more reliable / independent)
// blocked: true → content hidden behind overlay by default

const BALLOON_CATEGORIES = {
  "state-propaganda": {
    label: "State-Affiliated",
    color: "#b45309",
    bgColor: "#fffbeb",
    borderColor: "#d97706",
    dotColor: "#d97706",
    icon: `<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1L7.5 4.5H11L8.5 7L9.5 11L6 9L2.5 11L3.5 7L1 4.5H4.5L6 1Z" fill="currentColor"/></svg>`,
    textIcon: "★"
  },
  "state-funded": {
    label: "State-Funded",
    color: "#92400e",
    bgColor: "#fef3c7",
    borderColor: "#b45309",
    dotColor: "#b45309",
    icon: `<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M6 3v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    textIcon: "◉"
  },
  "misinformation": {
    label: "Bad Source",
    color: "#991b1b", bgColor: "#fef2f2", borderColor: "#ef4444", dotColor: "#ef4444",
    icon: `<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 10H1.5L6 1Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" fill="none"/><line x1="6" y1="4.5" x2="6" y2="7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="6" cy="9" r="0.7" fill="currentColor"/></svg>`,
    textIcon: "▲"
  },
  "conspiracy": {
    label: "Conspiracy / Fringe", hidden: true,
    color: "#6d28d9", bgColor: "#f5f3ff", borderColor: "#8b5cf6", dotColor: "#8b5cf6",
    icon: ``, textIcon: "✕"
  },
  "satire": {
    label: "Satire", hidden: true,
    color: "#1d4ed8", bgColor: "#eff6ff", borderColor: "#3b82f6", dotColor: "#3b82f6",
    icon: ``, textIcon: "ꙅ"
  }
};

const BALLOON_ACCOUNTS = [

  // ═══ RUSSIAN STATE PROPAGANDA (blocked by default) ════════════════════════

  {
    handle: "RT_com", label: "Russian State Media", category: "state-propaganda",
    blocked: true, trust: 4, country: "RU",
    detail: "RT (Russia Today) is funded by the Russian federal budget. Registered as a foreign agent in the US. Banned from broadcasting in the UK and EU since the 2022 invasion of Ukraine.",
    source: "Ofcom 2022 · EU Reg. 2022/350 · FARA"
  },
  {
    handle: "RTenEspanol", label: "Russian State Media (ES)", category: "state-propaganda",
    blocked: true, trust: 4, country: "RU",
    detail: "RT en Español — Spanish-language arm of RT. Identical ownership and editorial control.",
    source: "EU Reg. 2022/879 · FARA"
  },
  {
    handle: "RT_Arabic", label: "Russian State Media (AR)", category: "state-propaganda",
    blocked: true, trust: 4, country: "RU",
    detail: "RT Arabic targets Middle East and North Africa audiences with Russian state messaging.",
    source: "EU Reg. 2022/879 · RSF"
  },
  {
    handle: "RT_DE", label: "Russian State Media (DE)", category: "state-propaganda",
    blocked: true, trust: 4, country: "RU",
    detail: "RT DE — German-language channel. YouTube terminated it in 2021 for COVID misinformation. EU-banned since 2022.",
    source: "EU Reg. 2022/350"
  },
  {
    handle: "SptnkNE", label: "Sputnik", category: "state-propaganda",
    blocked: true, trust: 5, country: "RU",
    detail: "Sputnik is owned by Rossiya Segodnya, a Russian state media holding. Registered as a foreign agent in the US. All EU distribution suspended March 2022.",
    source: "EU Reg. 2022/350 · FARA · Twitter state-media label"
  },
  {
    handle: "SputnikInt", label: "Sputnik International", category: "state-propaganda",
    blocked: true, trust: 5, country: "RU",
    detail: "Sputnik International — secondary Sputnik English account. Same entity as SptnkNE.",
    source: "EU Reg. 2022/350"
  },
  {
    handle: "SputnikAfrica", label: "Sputnik Africa", category: "state-propaganda",
    blocked: true, trust: 4, country: "RU",
    detail: "Part of Russia's documented information operations across Africa. Part of Rossiya Segodnya.",
    source: "EU Reg. 2022/879 · Stanford Internet Observatory"
  },

  // ═══ RUSSIAN STATE (warned, not blocked) ══════════════════════════════════

  {
    handle: "tass_agency", label: "TASS (Russia)", category: "state-propaganda",
    blocked: true, trust: 18, country: "RU",
    detail: "TASS is Russia's official state news agency, operating under a government-approved charter. War coverage follows Kremlin directives.",
    source: "TASS Federal Charter · Twitter state-media label"
  },
  {
    handle: "RiaNovsoti", label: "RIA Novosti", category: "state-propaganda",
    blocked: true, trust: 14, country: "RU",
    detail: "RIA Novosti is owned by Rossiya Segodnya. EU banned its EU-territory distribution in February 2022.",
    source: "EU Reg. 2022/350"
  },
  {
    handle: "KremlinRussia_E", label: "Kremlin (Russia)", category: "state-propaganda",
    blocked: true, trust: 20, country: "RU",
    detail: "Official Kremlin press service. Statements are direct Russian government communications — primary source, but represents official state narrative.",
    source: "kremlin.ru"
  },
  {
    handle: "MFA_Russia", label: "Russian Foreign Ministry", category: "state-propaganda",
    blocked: true, trust: 18, country: "RU",
    detail: "Russia's Ministry of Foreign Affairs regularly posts claims about Ukraine and NATO that contradict independent journalism.",
    source: "Russian MFA"
  },

  // ═══ IRANIAN STATE (blocked) ══════════════════════════════════════════════

  {
    handle: "PressTV", label: "Iranian State Media", category: "state-propaganda",
    blocked: true, trust: 6, country: "IR",
    detail: "Press TV is owned by the Islamic Republic of Iran Broadcasting (IRIB), a body under the Supreme Leader. Ofcom revoked its UK licence. Produces heavily pro-regime content on Gaza, Syria, Ukraine, and Yemen.",
    source: "Ofcom 2021 · IRIB Charter"
  },
  {
    handle: "khamenei_ir", label: "Iran Supreme Leader", category: "state-propaganda",
    blocked: true, trust: 3, country: "IR",
    detail: "Official account of Ali Khamenei. Posts are direct state-directed messaging at the highest level of the Iranian government. Previously suspended by Twitter for violating world-leader policies.",
    source: "Iranian Constitution Art. 110"
  },
  {
    handle: "FarsNewsAgency", label: "IRGC-Linked Media", category: "state-propaganda",
    blocked: true, trust: 7, country: "IR",
    detail: "Fars News has documented links to the IRGC, which the US Treasury has designated as a terrorist organisation.",
    source: "US Treasury IRGC designation · CPJ"
  },

  // ═══ IRANIAN STATE (warned) ═══════════════════════════════════════════════

  {
    handle: "TasnimNews", label: "IRGC-Linked Media", category: "state-propaganda",
    blocked: true, trust: 12, country: "IR",
    detail: "Tasnim News Agency has documented ties to the IRGC Quds Force. Covers Middle East conflicts from an Iranian proxy-network perspective.",
    source: "Bellingcat · Middle East Eye"
  },
  {
    handle: "IRNA_en", label: "Iranian State Agency", category: "state-propaganda",
    blocked: true, trust: 20, country: "IR",
    detail: "IRNA is Iran's official state news agency, operating under the Ministry of Culture and Islamic Guidance.",
    source: "IRNA Charter"
  },
  {
    handle: "Iran_GOV", label: "Iranian Government", category: "state-propaganda",
    blocked: true, trust: 15, country: "IR",
    detail: "Official Iranian government account. Messaging on regional conflicts reflects Islamic Republic strategic communications.",
    source: "Islamic Republic of Iran"
  },

  // ═══ CHINESE STATE MEDIA ══════════════════════════════════════════════════

  {
    handle: "CGTNOfficial", label: "Chinese State Media", category: "state-propaganda",
    blocked: true, trust: 22, country: "CN",
    detail: "CGTN is a branch of CCTV under direct CCP authority. Ofcom revoked its UK licence in 2021. Twitter labelled it state-affiliated media.",
    source: "Ofcom 2021 · NPC China · Twitter state-media label"
  },
  {
    handle: "CGTN_America", label: "Chinese State Media (US)", category: "state-propaganda",
    blocked: true, trust: 22, country: "CN",
    detail: "CGTN America — US bureau of China Global Television Network, registered as a foreign agent under FARA.",
    source: "FARA registration"
  },
  {
    handle: "XinhuaNewsEN", label: "Chinese State Agency", category: "state-propaganda",
    blocked: true, trust: 25, country: "CN",
    detail: "Xinhua is the PRC's official state news agency under the State Council. US officials have described it as both a news outlet and intelligence-gathering operation.",
    source: "Chinese State Council · Twitter state-media label"
  },
  {
    handle: "PDChina", label: "CCP Official Newspaper", category: "state-propaganda",
    blocked: true, trust: 18, country: "CN",
    detail: "People's Daily is the official newspaper of the CCP Central Committee. Coverage directly reflects party policy on Taiwan, Ukraine, and territorial disputes.",
    source: "CCP Central Committee"
  },
  {
    handle: "globaltimesnews", label: "CCP Nationalist Media", category: "state-propaganda",
    blocked: true, trust: 15, country: "CN",
    detail: "Global Times (People's Daily subsidiary) is known for aggressive nationalist coverage. Oxford Internet Institute identified it as one of the world's most active state-media Twitter accounts.",
    source: "Oxford Internet Institute 2020 · MERICS"
  },
  {
    handle: "CCTVNews", label: "Chinese State Broadcaster", category: "state-propaganda",
    blocked: true, trust: 22, country: "CN",
    detail: "CCTV News — parent broadcaster of CGTN. Directly controlled by the CCP's Propaganda Department.",
    source: "State Administration of Radio and Television (China)"
  },

  // ═══ RUSSIAN STATE MEDIA — ADDITIONAL OUTLETS ════════════════════════════

  {
    handle: "SputnikMundo", label: "Sputnik Mundo (ES)", category: "state-propaganda",
    blocked: true, trust: 5, country: "RU",
    detail: "Spanish-language arm of Sputnik. Part of Rossiya Segodnya. EU-banned since 2022, suspended from Facebook and Instagram.",
    source: "EU Reg. 2022/879 · FARA"
  },
  {
    handle: "SputnikFrance", label: "Sputnik France", category: "state-propaganda",
    blocked: true, trust: 5, country: "RU",
    detail: "French-language Sputnik outlet. Closed down in France after EU sanctions. Continues operating online outside EU territory.",
    source: "EU Reg. 2022/350"
  },
  {
    handle: "Sputnik_Arabic", label: "Sputnik Arabic", category: "state-propaganda",
    blocked: true, trust: 5, country: "RU",
    detail: "Arabic-language Sputnik targeting Middle East and North Africa. Same ownership structure as all Sputnik brands.",
    source: "EU Reg. 2022/879 · FARA"
  },
  {
    handle: "SputnikNewsUS", label: "Sputnik US", category: "state-propaganda",
    blocked: true, trust: 5, country: "RU",
    detail: "US-facing Sputnik outlet, registered as a foreign agent under FARA before its closure. Continues digital distribution.",
    source: "FARA registration · DOJ"
  },
  {
    handle: "Ruptly", label: "Russian State Video Agency", category: "state-propaganda",
    blocked: true, trust: 8, country: "RU",
    detail: "Ruptly is RT's international video newswire. Provides footage to broadcasters worldwide. EU-sanctioned entity under Reg. 2022/350.",
    source: "EU Reg. 2022/350"
  },
  {
    handle: "RT_UK", label: "Russian State Media (UK)", category: "state-propaganda",
    blocked: true, trust: 4, country: "RU",
    detail: "RT UK — British arm of RT. Ofcom revoked its broadcast licence in 2022. EU distribution banned. Continues streaming online.",
    source: "Ofcom 2022 · EU Reg. 2022/350"
  },
  {
    handle: "RT_India", label: "Russian State Media (IN)", category: "state-propaganda",
    blocked: true, trust: 6, country: "RU",
    detail: "RT India — South Asian arm of RT. Targets Indian audiences with pro-Kremlin narratives on Ukraine, the West, and regional conflicts.",
    source: "EU Reg. 2022/879"
  },
  {
    handle: "ZvezdaTV_ru", label: "Russian Military TV", category: "state-propaganda",
    blocked: true, trust: 3, country: "RU",
    detail: "Zvezda is Russia's Ministry of Defence television channel. Broadcasts war coverage exclusively reflecting official Russian military narratives.",
    source: "Russian MoD · EU Reg. 2022/879"
  },
  {
    handle: "MargaritaSimonyan", label: "RT Editor-in-Chief", category: "state-propaganda",
    blocked: true, trust: 4, country: "RU",
    detail: "Margarita Simonyan is RT's editor-in-chief and Kremlin insider. Her personal account repeats and amplifies official Russian war narratives directly.",
    source: "EU sanctions list · Kremlin press pool"
  },
  {
    handle: "Redfishstream", label: "RT-Linked Media", category: "state-propaganda",
    blocked: true, trust: 9, country: "RU",
    detail: "Redfish Media was founded with RT funding. Produces social-media content aligned with Russian state narratives on protest movements and Western governments.",
    source: "DFRLab · EU DisinfoLab"
  },
  {
    handle: "SouthFront_org", label: "Russian GRU Operation", category: "state-propaganda",
    blocked: true, trust: 2, country: "RU",
    detail: "SouthFront was indicted by a US federal grand jury in 2021 as a Russian foreign intelligence (GRU) influence operation. Produces fake military analysis.",
    source: "US DOJ indictment 2021 · OFAC sanctions"
  },
  {
    handle: "RT_Documentary", label: "RT Documentary", category: "state-propaganda",
    blocked: true, trust: 5, country: "RU",
    detail: "RT's documentary channel. Produces long-form content reinforcing Kremlin geopolitical narratives. EU-sanctioned.",
    source: "EU Reg. 2022/350"
  },
  {
    handle: "IntelSlava", label: "Pro-Russia Info Ops", category: "state-propaganda",
    blocked: true, trust: 6, country: "RU",
    detail: "Intel Slava Z originated as a Telegram channel spreading Russian military narratives and has expanded to other platforms. Frequently first to spread unverified Russian claims.",
    source: "Bellingcat · EUvsDisinfo"
  },

  // ═══ RUSSIAN DIPLOMATIC / EMBASSY ACCOUNTS ════════════════════════════════

  {
    handle: "RussiaUN", label: "Russian UN Mission", category: "state-propaganda",
    blocked: true, trust: 20, country: "RU",
    detail: "Russia's Permanent Mission to the United Nations. Posts formal statements defending Russian military operations and blocking humanitarian resolutions.",
    source: "UN Security Council records"
  },
  {
    handle: "RusEmbUSA", label: "Russian Embassy (US)", category: "state-propaganda",
    blocked: true, trust: 15, country: "RU",
    detail: "Official Russian Embassy account targeting US audiences. Regularly publishes anti-NATO and anti-Ukraine messaging.",
    source: "US State Department · FARA"
  },
  {
    handle: "RusEmbLondon", label: "Russian Embassy (UK)", category: "state-propaganda",
    blocked: true, trust: 15, country: "RU",
    detail: "Russian Embassy London account. Used to spread disinformation about the Salisbury chemical attack and UK policy on Ukraine.",
    source: "UK FCDO · Bellingcat"
  },
  {
    handle: "RusEmbOttawa", label: "Russian Embassy (CA)", category: "state-propaganda",
    blocked: true, trust: 15, country: "RU",
    detail: "Russian Embassy Canada. Posts anti-NATO and pro-Kremlin messaging targeting Canadian policy audiences.",
    source: "Global Affairs Canada"
  },

  // ═══ CHINESE STATE MEDIA — ADDITIONAL OUTLETS ════════════════════════════

  {
    handle: "ChinaDaily", label: "CCP State Newspaper", category: "state-propaganda",
    blocked: true, trust: 20, country: "CN",
    detail: "China Daily is directly funded and controlled by the CCP Propaganda Department. Paid to insert its content into Western newspapers including The Wall Street Journal and The New York Times.",
    source: "DOJ FARA filing · NED 2020"
  },
  {
    handle: "HuXijin_GT", label: "Global Times Editor", category: "state-propaganda",
    blocked: true, trust: 12, country: "CN",
    detail: "Former editor-in-chief of Global Times. Known for aggressive nationalist commentary that amplifies CCP positions. Posts treated as semi-official Chinese government signals.",
    source: "MERICS · Oxford Internet Institute"
  },
  {
    handle: "MFA_China", label: "Chinese Foreign Ministry", category: "state-propaganda",
    blocked: true, trust: 20, country: "CN",
    detail: "China's Ministry of Foreign Affairs official account. Distributes official Chinese government positions, including denials of human rights violations.",
    source: "Chinese Foreign Ministry"
  },
  {
    handle: "SpokespersonCHN", label: "Chinese MFA Spokesperson", category: "state-propaganda",
    blocked: true, trust: 18, country: "CN",
    detail: "Official Chinese MFA spokesperson account. Coordinates disinformation narratives on Taiwan, Xinjiang, and COVID-19 origins.",
    source: "Stanford Internet Observatory 2020"
  },
  {
    handle: "CGTNAfrica", label: "Chinese State Media (Africa)", category: "state-propaganda",
    blocked: true, trust: 22, country: "CN",
    detail: "CGTN Africa — Chinese state media targeting the African continent. Part of Beijing's broader influence strategy to shape narratives across Africa.",
    source: "CSIS China Africa Report · Twitter state-media label"
  },
  {
    handle: "ChinaEmbassyUK", label: "Chinese Embassy (UK)", category: "state-propaganda",
    blocked: true, trust: 18, country: "CN",
    detail: "Chinese Embassy London. Used to spread disinformation about Hong Kong, Xinjiang, and COVID-19 origins at UK audiences.",
    source: "UK FCDO · Stanford Internet Observatory"
  },
  {
    handle: "ChinaEmbassyUSA", label: "Chinese Embassy (US)", category: "state-propaganda",
    blocked: true, trust: 18, country: "CN",
    detail: "Chinese Embassy Washington. Regularly posts CCP narratives on Taiwan, Tibet, and Xinjiang at US audiences.",
    source: "DOJ · FARA"
  },
  {
    handle: "BJReview", label: "CCP-Affiliated Magazine", category: "state-propaganda",
    blocked: true, trust: 20, country: "CN",
    detail: "Beijing Review is an English-language magazine published under CCP supervision since 1958. Content reflects official CCP positions on all major geopolitical issues.",
    source: "CCP Central Propaganda Department"
  },
  {
    handle: "ChinaDailyUSA", label: "CCP Newspaper (US)", category: "state-propaganda",
    blocked: true, trust: 18, country: "CN",
    detail: "China Daily's US edition. Registered as a foreign agent under FARA. Paid to place advertorial supplements in major US publications.",
    source: "DOJ FARA filing"
  },
  {
    handle: "ChinaDailyEurope", label: "CCP Newspaper (EU)", category: "state-propaganda",
    blocked: true, trust: 18, country: "CN",
    detail: "China Daily European edition. Distributes CCP narratives to European audiences. Funded by China's State Council Information Office.",
    source: "EU DisinfoLab · Vrije Universiteit Brussel"
  },
  {
    handle: "CRI_English", label: "China Radio International", category: "state-propaganda",
    blocked: true, trust: 20, country: "CN",
    detail: "CRI is China's official state radio. Broadcast across five continents. Has secretly funded and managed local radio stations in multiple countries to amplify CCP messaging.",
    source: "Reuters investigation 2015 · FARA"
  },
  {
    handle: "CGTNFrancais", label: "Chinese State Media (FR)", category: "state-propaganda",
    blocked: true, trust: 22, country: "CN",
    detail: "CGTN French — French-language arm of China Global Television Network. CCP-controlled. Targets Francophone African and European audiences.",
    source: "EU DisinfoLab · OFCOM equivalent France"
  },
  {
    handle: "CGTN_Arabic", label: "Chinese State Media (AR)", category: "state-propaganda",
    blocked: true, trust: 22, country: "CN",
    detail: "CGTN Arabic — targets Middle East and North Africa audiences with CCP-approved narratives.",
    source: "Twitter state-media label · EU DisinfoLab"
  },
  {
    handle: "ChinaEmbGermany", label: "Chinese Embassy (DE)", category: "state-propaganda",
    blocked: true, trust: 18, country: "CN",
    detail: "Chinese Embassy Berlin. Documented for spreading Xinjiang denial narratives and COVID-19 origin disinformation in German.",
    source: "German BfV annual report 2022"
  },

  // ═══ IRANIAN STATE / PROXY MEDIA — ADDITIONAL ════════════════════════════

  {
    handle: "Mehr_English", label: "IRGC-Linked News Agency", category: "state-propaganda",
    blocked: true, trust: 10, country: "IR",
    detail: "Mehr News Agency has close institutional ties to the IRGC. English-language service targets international audiences with Iranian state narratives.",
    source: "Bellingcat · US Treasury IRGC links"
  },
  {
    handle: "HispanTV", label: "Iranian Spanish-Language TV", category: "state-propaganda",
    blocked: true, trust: 8, country: "IR",
    detail: "HispanTV is Iran's Spanish-language state television channel, targeting Latin American audiences. Funded by Islamic Republic of Iran Broadcasting.",
    source: "IRIB Charter · CONATEL Venezuela"
  },
  {
    handle: "Al_Alam_News", label: "Iranian Arabic TV", category: "state-propaganda",
    blocked: true, trust: 8, country: "IR",
    detail: "Al-Alam (The World) is Iran's Arabic-language state TV channel. Broadcasts across the Arab world with pro-Iran, anti-Israel and anti-US messaging.",
    source: "IRIB Charter · Arab Media Institute"
  },
  {
    handle: "IranMission", label: "Iran UN Mission", category: "state-propaganda",
    blocked: true, trust: 15, country: "IR",
    detail: "Iran's Permanent Mission to the United Nations. Official diplomatic communications often used to spread state narratives on nuclear programme and regional conflicts.",
    source: "IAEA reports · UN Security Council"
  },
  {
    handle: "PressTV_Arabic", label: "Iranian State Media (AR)", category: "state-propaganda",
    blocked: true, trust: 6, country: "IR",
    detail: "PressTV's Arabic-language arm. Same IRIB ownership as English PressTV. Ofcom-revoked broadcaster targeting Arab-language audiences.",
    source: "Ofcom 2021 · IRIB Charter"
  },
  {
    handle: "iFilmTV_en", label: "Iranian State Entertainment TV", category: "state-propaganda",
    blocked: true, trust: 10, country: "IR",
    detail: "iFilm is an Iranian state broadcaster under IRIB producing Farsi/dubbed content that reinforces Islamic Republic cultural narratives.",
    source: "IRIB Charter"
  },
  {
    handle: "MashreghNews", label: "IRGC-Aligned Media", category: "state-propaganda",
    blocked: true, trust: 8, country: "IR",
    detail: "Mashregh News is closely linked to the IRGC and publishes hardline content on regional conflicts, foreign policy, and domestic dissent.",
    source: "Bellingcat · IranWire 2021"
  },
  {
    handle: "KayhanIntl", label: "Iranian Hardline Newspaper", category: "state-propaganda",
    blocked: true, trust: 6, country: "IR",
    detail: "Kayhan International is the English arm of Kayhan, whose editor is personally appointed by Iran's Supreme Leader. Among the most hardline pro-regime outlets.",
    source: "Iranian Constitution · Human Rights Watch"
  },
  {
    handle: "AlMayadeen_en", label: "Iran-Aligned Lebanese TV", category: "state-propaganda",
    blocked: true, trust: 14, country: "IR",
    detail: "Al Mayadeen is a Beirut-based TV channel with documented Iranian and Hezbollah funding. Covers the region from a Resistance Axis perspective.",
    source: "Carnegie Middle East Center · Bellingcat"
  },
  {
    handle: "AlManarNews", label: "Hezbollah TV (Banned)", category: "state-propaganda",
    blocked: true, trust: 2, country: "LB",
    detail: "Al-Manar is Hezbollah's official television channel. Designated as a terrorist organisation's media arm by the US Treasury. Banned in France, Germany, Spain, and the US.",
    source: "US Treasury SDN list 2006 · EU terrorist list"
  },
  {
    handle: "AlAhedNews", label: "Hezbollah Media", category: "state-propaganda",
    blocked: true, trust: 5, country: "LB",
    detail: "Al-Ahed News is Hezbollah's official online news outlet. Designated alongside Al-Manar as a Specially Designated Global Terrorist (SDGT) entity.",
    source: "US Treasury SDN list"
  },

  // ═══ VENEZUELAN / CUBAN / LATIN AMERICAN STATE MEDIA ═════════════════════

  {
    handle: "NicolasMaduro", label: "Venezuelan President", category: "state-propaganda",
    blocked: true, trust: 8, country: "VE",
    detail: "Nicolas Maduro's official account. Posts from Venezuela's authoritarian government include denial of human rights abuses and electoral fraud allegations.",
    source: "UN Human Rights Council 2020 · ICC referral"
  },
  {
    handle: "VTVcanalOficial", label: "Venezuelan State TV", category: "state-propaganda",
    blocked: true, trust: 10, country: "VE",
    detail: "Venezolana de Televisión (VTV) is Venezuela's state broadcaster under CONATEL. Suppresses independent journalism and amplifies Maduro government narratives.",
    source: "RSF Venezuela report · CPJ"
  },
  {
    handle: "Granma_Digital", label: "Cuban Communist Party Paper", category: "state-propaganda",
    blocked: true, trust: 8, country: "CU",
    detail: "Granma is the official newspaper of the Communist Party of Cuba. All content reflects the party line. No independent journalism.",
    source: "CPJ Cuba press freedom report"
  },
  {
    handle: "CubaDebate", label: "Cuban State Media", category: "state-propaganda",
    blocked: true, trust: 10, country: "CU",
    detail: "CubaDebate is a Cuban state media outlet that defends the Castro/Díaz-Canel government and attacks US policy. No independent editorial oversight.",
    source: "RSF Cuba report"
  },
  {
    handle: "RadioHavana", label: "Cuban State Radio", category: "state-propaganda",
    blocked: true, trust: 10, country: "CU",
    detail: "Radio Havana Cuba is Cuba's international state broadcaster, operating since 1961. Content reflects Cuban Communist Party positions on geopolitics.",
    source: "CPJ · Cuba Ministry of Communications"
  },
  {
    handle: "ActualidadRT", label: "RT Spanish / Latin America", category: "state-propaganda",
    blocked: true, trust: 5, country: "RU",
    detail: "Actualidad RT is RT's main Spanish-language account targeting Latin American audiences. FARA registered. EU distribution suspended 2022.",
    source: "FARA · EU Reg. 2022/350"
  },
  {
    handle: "teleSURArabic", label: "Venezuelan State Media (AR)", category: "state-propaganda",
    blocked: true, trust: 18, country: "VE",
    detail: "teleSUR's Arabic-language service targeting Middle East audiences. Part of Venezuela's state-owned media network.",
    source: "CONATEL Venezuela"
  },
  {
    handle: "Prensa_Latina", label: "Cuban State News Agency", category: "state-propaganda",
    blocked: true, trust: 12, country: "CU",
    detail: "Prensa Latina is Cuba's state news agency, founded 1959. Distributes Cuban government news internationally with no editorial independence.",
    source: "Cuban Communist Party · CPJ"
  },

  // ═══ SYRIAN STATE MEDIA ════════════════════════════════════════════════════

  {
    handle: "SANAnews_en", label: "Syrian State News Agency", category: "state-propaganda",
    blocked: true, trust: 5, country: "SY",
    detail: "SANA is the Syrian Arab Republic's official news agency, under Assad government control. War reporting denies civilian casualties and chemical weapons use.",
    source: "OPCW reports · UN COI Syria"
  },
  {
    handle: "Syria_Times_en", label: "Syrian State Newspaper", category: "state-propaganda",
    blocked: true, trust: 6, country: "SY",
    detail: "Syria Times is a pro-Assad English-language newspaper operating under Syrian Ministry of Information oversight.",
    source: "Syrian MoI · CPJ Syria"
  },
  {
    handle: "alMasdarNews", label: "Pro-Assad Media", category: "state-propaganda",
    blocked: true, trust: 10, country: "SY",
    detail: "Al-Masdar News (The Source) consistently defends the Assad government and publishes pro-Russian narratives on Syria, Libya, and Ukraine.",
    source: "Bellingcat · EUvsDisinfo"
  },

  // ═══ BELARUSIAN STATE MEDIA ════════════════════════════════════════════════

  {
    handle: "BeltaNews", label: "Belarusian State News Agency", category: "state-propaganda",
    blocked: true, trust: 8, country: "BY",
    detail: "BELTA is Belarus's official state news agency under the Lukashenko government. Coverage denies the 2020 election fraud and protest crackdowns.",
    source: "EU sanctions Belarus 2020 · RSF"
  },
  {
    handle: "BelarusMFA_", label: "Belarusian Foreign Ministry", category: "state-propaganda",
    blocked: true, trust: 10, country: "BY",
    detail: "Belarus's Ministry of Foreign Affairs account. Defends the Lukashenko regime's forced landing of Ryanair flight FR4978 and detention of dissident journalist Roman Protasevich.",
    source: "ICAO report 2022 · EU sanctions"
  },
  {
    handle: "ONTtvBy", label: "Belarusian State TV", category: "state-propaganda",
    blocked: true, trust: 5, country: "BY",
    detail: "ONT is one of Belarus's main state television channels. Broadcasts Lukashenko government propaganda and has aired forced confessions of detainees.",
    source: "RSF Belarus · Viasna Human Rights Centre"
  },

  // ═══ TURKISH STATE-ALIGNED MEDIA ═════════════════════════════════════════

  {
    handle: "A_Haber", label: "Pro-Erdoğan Turkish TV", category: "state-funded",
    blocked: false, trust: 28, country: "TR",
    detail: "A Haber (A News) is a Turkish news channel owned by Kalyon Group, a major Erdoğan-linked conglomerate. RSF ranks Turkish media freedom among the lowest in Europe.",
    source: "RSF Turkey 2023 · Reuters Institute Turkey"
  },
  {
    handle: "YeniSafak_en", label: "Pro-Erdoğan Newspaper (EN)", category: "state-funded",
    blocked: false, trust: 25, country: "TR",
    detail: "Yeni Şafak is Turkey's leading pro-government newspaper with close ties to Erdoğan's AKP. English edition distributes Turkish government narratives internationally.",
    source: "RSF Turkey · Freedom House 2023"
  },
  {
    handle: "Sabah_en", label: "Pro-Erdoğan Newspaper (EN)", category: "state-funded",
    blocked: false, trust: 28, country: "TR",
    detail: "Sabah is among Turkey's most widely read pro-government newspapers. Owned by Kalyon Group. English edition targets international audience.",
    source: "Reuters Institute Digital News Report 2023"
  },

  // ═══ HUNGARIAN GOVERNMENT-LINKED MEDIA ════════════════════════════════════

  {
    handle: "HungaryToday", label: "Orbán Government Media (EN)", category: "state-funded",
    blocked: false, trust: 30, country: "HU",
    detail: "Hungary Today is an English-language outlet linked to KESMA (Central European Press and Media Foundation), the Orbán government's media consolidation vehicle that controls 80%+ of Hungarian media.",
    source: "KESMA · RSF Hungary 2023"
  },
  {
    handle: "DailyNewsHungary", label: "Orbán-Linked English Media", category: "state-funded",
    blocked: false, trust: 30, country: "HU",
    detail: "Daily News Hungary operates in the same Budapest media landscape dominated by Orbán-linked owners after the 2018 KESMA consolidation.",
    source: "European Centre for Press and Media Freedom 2022"
  },

  // ═══ SERBIAN STATE MEDIA ══════════════════════════════════════════════════

  {
    handle: "RTS_Vesti", label: "Serbian State Broadcaster", category: "state-funded",
    blocked: false, trust: 35, country: "RS",
    detail: "RTS (Radio Television Serbia) is Serbia's public broadcaster. Coverage regularly aligns with the Vučić government's pro-Russia tilt and Serbia's EU candidate equivocation.",
    source: "SEENPM · RSF Serbia 2023"
  },
  {
    handle: "Tanjug_rs", label: "Serbian State News Agency", category: "state-funded",
    blocked: false, trust: 32, country: "RS",
    detail: "Tanjug is Serbia's state news agency. Distributes official Serbian government positions, often echoing Kremlin narratives on Kosovo and Ukraine.",
    source: "EUvsDisinfo · SEENPM"
  },

  // ═══ PAKISTANI MILITARY MEDIA ════════════════════════════════════════════

  {
    handle: "OfficialDGISPR", label: "Pakistani Military Media Wing", category: "state-propaganda",
    blocked: true, trust: 20, country: "PK",
    detail: "ISPR (Inter-Services Public Relations) is the Pakistani military's powerful media wing. Controls military narrative in Pakistan. Has spread disinformation about Afghanistan, India, and internal security.",
    source: "RUSI · Freedom Network Pakistan"
  },

  // ═══ NORTH KOREAN AFFILIATED ══════════════════════════════════════════════

  {
    handle: "KFA_DPRK", label: "North Korea Friendship Org", category: "state-propaganda",
    blocked: true, trust: 2, country: "KP",
    detail: "Korea Friendship Association is a foreign advocacy organisation for the North Korean state. Distributes KCNA content and promotes the Kim regime internationally.",
    source: "UN Panel of Experts NK · KCNA Watch"
  },

  // ═══ PRO-RUSSIA WESTERN VOICES (RT contributors / amplifiers) ════════════

  {
    handle: "GrayzoneNews", label: "Russian State Media Contributor", category: "state-propaganda",
    blocked: true, trust: 10,
    detail: "The Grayzone consistently amplifies Russian and Iranian state narratives on Syria, Ukraine, and Venezuela. Multiple staff are documented RT contributors. Has coordinated with Russian disinformation campaigns.",
    source: "Bellingcat · Stanford Internet Observatory 2020 · EU DisinfoLab"
  },
  {
    handle: "MaxBlumenthal", label: "RT Contributor", category: "state-propaganda",
    blocked: true, trust: 12,
    detail: "Max Blumenthal (founder of The Grayzone) is a documented RT contributor. Consistently amplifies Russian state narratives on Ukraine and Syria. Attended Russian state media events.",
    source: "RT contributor credits · Bellingcat · OCCRP"
  },
  {
    handle: "aaronjmate", label: "RT Contributor", category: "state-propaganda",
    blocked: true, trust: 14,
    detail: "Aaron Maté (The Grayzone) is a documented RT contributor who has amplified Kremlin narratives on chemical weapons in Syria and Russian interference investigations.",
    source: "RT contributor credits · Stanford Internet Observatory"
  },
  {
    handle: "GarlandNixon", label: "RT America Contributor", category: "state-propaganda",
    blocked: true, trust: 10,
    detail: "Garland Nixon was a contributor to RT America before its closure. Amplifies Russian state narratives on Ukraine, NATO, and US domestic politics.",
    source: "RT America contributor credits · FARA disclosure"
  },
  {
    handle: "ScottRitter11", label: "RT Contributor", category: "state-propaganda",
    blocked: true, trust: 10,
    detail: "Scott Ritter is a former UN weapons inspector turned RT contributor. Amplifies Russian narratives on Ukraine, regularly appearing on Russian state media.",
    source: "RT contributor credits · FARA analysis"
  },
  {
    handle: "Eva_Karene", label: "RT Contributor", category: "state-propaganda",
    blocked: true, trust: 10,
    detail: "Eva Bartlett is a Canadian blogger and documented RT contributor who has denied Syrian chemical weapons attacks and amplified Russian military narratives.",
    source: "RT contributor credits · UN Syria COI"
  },
  {
    handle: "PartisanGirl", label: "Pro-Assad / RT Contributor", category: "state-propaganda",
    blocked: true, trust: 10, country: "SY",
    detail: "Maram Susli (Partisan Girl) is a pro-Assad commentator and documented RT contributor. Has denied Syrian chemical weapons attacks and spreads Russian geopolitical narratives.",
    source: "RT contributor credits · Bellingcat Syria"
  },
  {
    handle: "TuckerCarlson", label: "Russian State Media Amplifier", category: "state-propaganda",
    blocked: true, trust: 22,
    detail: "Tucker Carlson conducted an exclusive interview with Vladimir Putin distributed by Kremlin channels. US intelligence described his programme as a target for Russian influence operations. Amplifies Kremlin narratives on NATO and Ukraine.",
    source: "US Intelligence Community 2020 · Kremlin distribution 2024"
  },
  {
    handle: "DouglasMMacG", label: "Russian State Media Amplifier", category: "state-propaganda",
    blocked: true, trust: 18,
    detail: "Douglas Macgregor, a former US Army colonel, regularly appears on Russian state media. His forecasts and narratives on Ukraine consistently align with Kremlin positions.",
    source: "RT appearance logs · EUvsDisinfo"
  },

  // ═══ OTHER STATE PROPAGANDA ════════════════════════════════════════════════

  {
    handle: "teleSURtv", label: "Venezuelan State Media", category: "state-propaganda",
    blocked: true, trust: 20, country: "VE",
    detail: "teleSUR is majority-owned by the Venezuelan government (CONATEL), with stakes held by Cuba, Nicaragua, and Bolivia.",
    source: "teleSUR shareholder structure · CONATEL"
  },

  // ═══ STATE-FUNDED (editorial independence varies) ══════════════════════════

  {
    handle: "AJEnglish", label: "Qatari-Funded Media", category: "state-funded",
    blocked: false, trust: 52, country: "QA",
    detail: "Al Jazeera is funded by Qatar's royal family through the AJMN. While it covers stories ignored by Western media, its coverage of Qatar's allies/adversaries reflects Qatari foreign policy interests.",
    source: "AJMN Charter · Freedom House 2023"
  },
  {
    handle: "TRTWorld", label: "Turkish State Broadcaster", category: "state-funded",
    blocked: false, trust: 44, country: "TR",
    detail: "TRT World is a subsidiary of Turkey's state broadcaster TRT. Coverage on Kurdish groups, Syria, and the Caucasus often aligns with Ankara's positions.",
    source: "TRT Act No. 2954 · RSF"
  },
  {
    handle: "AnadoluAgency", label: "Turkish State Agency", category: "state-funded",
    blocked: false, trust: 46, country: "TR",
    detail: "Anadolu Agency is majority-owned by the Turkish government. Its conflict coverage reflects Turkish government positions, especially on Syria.",
    source: "AA shareholder structure"
  },
  {
    handle: "MEE_Palestine", label: "Qatar-Linked Media", category: "state-funded",
    blocked: false, trust: 40, country: "QA",
    detail: "Middle East Eye receives funding from sources linked to Qatar. Covers conflicts in a way sympathetic to Muslim Brotherhood-affiliated movements. Banned in Egypt and UAE.",
    source: "Reuters funding investigation 2020"
  },

  // ═══ RUSSIAN OFFICIALS & DIPLOMATIC ══════════════════════════════════════

  {
    handle: "MedvedevRussiaE", label: "Russian Security Council", category: "state-propaganda",
    blocked: true, trust: 8, country: "RU",
    detail: "Dmitry Medvedev, Deputy Chairman of Russia's Security Council. Known for nuclear threats and extreme anti-Western posts used in state information operations.",
    source: "Kremlin Security Council · Reuters"
  },
  {
    handle: "zakharova_mfa", label: "Russian MFA Spokesperson", category: "state-propaganda",
    blocked: true, trust: 12, country: "RU",
    detail: "Maria Zakharova is the official spokesperson for Russia's Ministry of Foreign Affairs. A primary source of Russian government disinformation narratives on Ukraine and NATO.",
    source: "Russian MFA"
  },
  {
    handle: "nebenzya", label: "Russian UN Ambassador", category: "state-propaganda",
    blocked: true, trust: 14, country: "RU",
    detail: "Vasily Nebenzya is Russia's Permanent Representative to the UN. Regularly uses UN platforms and social media to spread Kremlin narratives on Ukraine.",
    source: "UN Security Council records"
  },
  {
    handle: "Depoluyan", label: "Russian Deputy UN Envoy", category: "state-propaganda",
    blocked: true, trust: 14, country: "RU",
    detail: "Dmitry Polyansky, Russia's Deputy Permanent Representative to the UN. Active amplifier of Russian MFA narratives on Western social media.",
    source: "UN records"
  },
  {
    handle: "solovievlive", label: "Russian State TV Host", category: "state-propaganda",
    blocked: true, trust: 5, country: "RU",
    detail: "Vladimir Solovyov hosts flagship shows on Russia-1 and Rossiya-24 (state TV). Sanctioned by the EU, UK, and US for spreading war propaganda. Owns property in Italy under sanctions.",
    source: "EU sanctions list · UK FCDO · OFAC"
  },
  {
    handle: "RT_FR", label: "Russian State Media (FR)", category: "state-propaganda",
    blocked: true, trust: 4, country: "RU",
    detail: "RT en Français — French-language arm of RT. Banned from broadcasting in EU since March 2022 under EU Reg. 2022/350.",
    source: "EU Reg. 2022/350"
  },
  {
    handle: "vesti_ru", label: "Russian State TV News", category: "state-propaganda",
    blocked: true, trust: 12, country: "RU",
    detail: "Vesti.ru is the digital news arm of Rossiya-1, a Russian state television channel directly controlled by VGTRK (All-Russia State Television). War coverage follows Kremlin directives.",
    source: "VGTRK charter · RSF"
  },
  {
    handle: "pravdaoficial", label: "Pravda (Russia)", category: "state-propaganda",
    blocked: true, trust: 10, country: "RU",
    detail: "Pravda is the historic mouthpiece of Russian state power. Remained closely aligned with the Kremlin and the Communist Party throughout post-Soviet transitions.",
    source: "RSF · Communist Party of Russia affiliation"
  },
  {
    handle: "RussEmbFrance", label: "Russian Embassy (France)", category: "state-propaganda",
    blocked: true, trust: 15, country: "RU",
    detail: "Official Russian Embassy in France account. Part of Russia's coordinated diplomatic information operation across European social media.",
    source: "EU Information Manipulation report 2022"
  },
  {
    handle: "RusEmbassyGer", label: "Russian Embassy (Germany)", category: "state-propaganda",
    blocked: true, trust: 15, country: "RU",
    detail: "Official Russian Embassy in Germany. Regularly posts disinformation narratives targeting German-speaking audiences.",
    source: "BfV German domestic intelligence · EU EUvsDisinfo"
  },

  // ═══ CHINESE STATE OFFICIALS ═════════════════════════════════════════════

  {
    handle: "ZhaoLijian", label: "Chinese MFA (Former)", category: "state-propaganda",
    blocked: true, trust: 10, country: "CN",
    detail: "Zhao Lijian is a former Chinese MFA spokesperson who pioneered aggressive 'wolf warrior' diplomacy on Twitter. Known for spreading debunked conspiracy theories including Fort Detrick COVID claims.",
    source: "RAND Corporation · Twitter state-media label"
  },
  {
    handle: "LiuPengyu", label: "Chinese Embassy Spokesperson", category: "state-propaganda",
    blocked: true, trust: 14, country: "CN",
    detail: "Liu Pengyu is the spokesperson for China's Embassy in Washington, DC. Prominent amplifier of Chinese government narratives denying Xinjiang abuses and promoting Belt and Road.",
    source: "Chinese Embassy Washington"
  },
  {
    handle: "CGTNDocumentary", label: "Chinese State Media", category: "state-propaganda",
    blocked: true, trust: 18, country: "CN",
    detail: "CGTN Documentary — documentary division of CGTN, China's state international broadcaster. Produces propaganda-style documentaries on Tibet, Xinjiang, and Taiwan.",
    source: "Ofcom CGTN licence revocation 2021"
  },
  {
    handle: "ChinaEmbassy_AU", label: "Chinese Embassy (Australia)", category: "state-propaganda",
    blocked: true, trust: 16, country: "CN",
    detail: "Official Chinese Embassy in Australia. Involved in documented influence operations targeting Chinese-Australian communities.",
    source: "ASPI China Influence report"
  },
  {
    handle: "ChinaEmbFrance", label: "Chinese Embassy (France)", category: "state-propaganda",
    blocked: true, trust: 16, country: "CN",
    detail: "Chinese Embassy in France. Published disputed claims about Taiwan, Xinjiang, and COVID origins.",
    source: "French SGDSN · Reuters"
  },
  {
    handle: "ChinaXinhuaEN", label: "Xinhua (China)", category: "state-propaganda",
    blocked: true, trust: 20, country: "CN",
    detail: "Xinhua News Agency English — additional Xinhua account. State-run agency with over 10,000 domestic and overseas staff. All foreign coverage subject to Party censorship.",
    source: "CPJ · RSF"
  },

  // ═══ SAUDI / GULF STATE MEDIA ════════════════════════════════════════════

  {
    handle: "AlArabiya", label: "Saudi-Funded Media", category: "state-funded",
    blocked: false, trust: 42, country: "SA",
    detail: "Al Arabiya is owned by MBC Group, controlled by Saudi-linked investors with close ties to the Saudi royal family. Coverage of Yemen and Iran closely tracks Saudi state positions.",
    source: "Gulf Media Journal · CPJ"
  },
  {
    handle: "AlArabiyaEng", label: "Saudi-Funded Media (EN)", category: "state-funded",
    blocked: false, trust: 42, country: "SA",
    detail: "Al Arabiya English — same ownership as Al Arabiya. English-language arm targeting Western audiences.",
    source: "MBC Group shareholder structure"
  },
  {
    handle: "skynewsarabia", label: "UAE-Funded Media", category: "state-funded",
    blocked: false, trust: 44, country: "AE",
    detail: "Sky News Arabia is a joint venture between Sky Group and Abu Dhabi Media Investment Corporation (UAE government-linked). Coverage of Qatar, Iran, and Turkey reflects UAE government positions.",
    source: "ADMIC ownership · Middle East Eye"
  },

  // ═══ VENEZUELAN / BOLIVARIAN ══════════════════════════════════════════════

  {
    handle: "teleSUR", label: "Venezuelan State TV", category: "state-propaganda",
    blocked: true, trust: 14, country: "VE",
    detail: "TeleSUR is majority-owned by the Venezuelan government with partial stakes from Cuba, Bolivia, and Nicaragua. Produces anti-US content aligned with the Bolivarian Alliance narrative.",
    source: "TeleSUR shareholder documents"
  },
  {
    handle: "CorreodelOrinoco", label: "Venezuelan State Press", category: "state-propaganda",
    blocked: true, trust: 10, country: "VE",
    detail: "Correo del Orinoco is an official Venezuelan government newspaper, founded by Hugo Chavez in 2009. Covers the Maduro government without editorial independence.",
    source: "Venezuelan Government Press"
  },
  {
    handle: "AVN_Agencia", label: "Venezuelan State News", category: "state-propaganda",
    blocked: true, trust: 12, country: "VE",
    detail: "Agencia Venezolana de Noticias (AVN) is Venezuela's official state news agency. All content represents Venezuelan government communications.",
    source: "Venezuelan Ministry of Communication"
  },

  // ═══ MORE IRAN-ALIGNED ════════════════════════════════════════════════════

  {
    handle: "Iran_Diplomacy", label: "Iranian Diplomatic Network", category: "state-propaganda",
    blocked: true, trust: 15, country: "IR",
    detail: "Iranian government-linked diplomatic account. Posts align with Iranian MFA narratives on nuclear negotiations, US sanctions, and regional conflicts.",
    source: "Iranian MOFA"
  },

  // ═══ PRO-KREMLIN WESTERN VOICES ═══════════════════════════════════════════

  {
    handle: "BenjaminNorton", label: "Pro-Russia/China Analyst", category: "misinformation",
    blocked: true, trust: 20,
    detail: "Ben Norton (Multipolarista) produces analysis that consistently amplifies Russian and Chinese state narratives while dismissing Western institutions. Content widely cited by RT and CGTN.",
    source: "Hamilton68 · FIMI Watch"
  },
  {
    handle: "Multipolarista", label: "Pro-Russia/China Media", category: "misinformation",
    blocked: true, trust: 18,
    detail: "Multipolarista is Ben Norton's publication. Consistently promotes Russian and Chinese government narratives on Ukraine, Taiwan, and Western sanctions.",
    source: "DFRLab · Hamilton 2.0"
  },
  {
    handle: "PatrickLancaster", label: "Pro-Kremlin Reporter", category: "misinformation",
    blocked: true, trust: 15, country: "RU",
    detail: "Patrick Lancaster is a UK-born journalist operating from Russian-controlled areas of Ukraine. Content exclusively presents Russian military perspectives without independent verification.",
    source: "Bellingcat · BBC Verify"
  },
  {
    handle: "eva_bartlett", label: "Pro-Kremlin Reporter", category: "misinformation",
    blocked: true, trust: 14,
    detail: "Eva Bartlett is a Canadian blogger whose work claiming Syrian hospital attacks were staged has been debunked by Reuters, Snopes, and the UN. Widely cited by Russian state media.",
    source: "Reuters fact-check · Snopes · The Guardian"
  },

  // ═══ MISINFORMATION / BAD SOURCE ══════════════════════════════════════════

  {
    handle: "BreitbartNews", label: "Far-Right Outlet", category: "misinformation",
    blocked: true, trust: 22,
    detail: "Breitbart News receives a red rating from NewsGuard for repeatedly publishing false or misleading content. Multiple stories retracted after legal action or debunking.",
    source: "NewsGuard Red rating · AP fact-checks"
  },
  {
    handle: "TheGatewayPundit", label: "Habitual Misinformation", category: "misinformation",
    blocked: true, trust: 8,
    detail: "The Gateway Pundit has been documented spreading false stories about elections, shootings, and COVID. Rated as one of the most prolific sources of online misinformation by the Stanford Internet Observatory.",
    source: "Stanford Internet Observatory · NewsGuard Red · Reuters"
  },
  {
    handle: "ZeroHedge", label: "Financial Disinformation", category: "misinformation",
    blocked: true, trust: 24,
    detail: "Zero Hedge published under a fake Bulgarian author name. The EU DisinfoLab and US intelligence found it amplifies Russian state narratives. Banned from Twitter in 2020, reinstated under new ownership.",
    source: "EU DisinfoLab · Bloomberg investigation · DNI report"
  },
  {
    handle: "Newsmax", label: "Low Reliability News", category: "misinformation",
    blocked: true, trust: 28,
    detail: "Newsmax reached a settlement with Dominion Voting Systems related to false 2020 election fraud claims. Multiple anchors resigned over editorial pressure to spread false narratives.",
    source: "Dominion settlement · AP · CPJ"
  },
  {
    handle: "NewsmaxTV", label: "Low Reliability News", category: "misinformation",
    blocked: true, trust: 28,
    detail: "Newsmax TV — broadcast arm of Newsmax. Settled with Dominion Voting Systems for claims related to 2020 election misinformation.",
    source: "Dominion settlement · Newsguard"
  },
  {
    handle: "PragerU", label: "Misleading Education Content", category: "misinformation",
    blocked: true, trust: 30,
    detail: "PragerU videos have been rated inaccurate on climate change, history, and economics by AFP Fact Check, Politifact, and academic reviewers. Not an accredited university despite the name.",
    source: "AFP Fact Check · Politifact · California Dept of Education"
  },
  {
    handle: "JackPosobiec", label: "Habitual Misinformation", category: "misinformation",
    blocked: true, trust: 12,
    detail: "Jack Posobiec spread the debunked Seth Rich conspiracy theory and multiple false stories about Comet Ping Pong (Pizzagate). Verified as spreading Russian disinformation by the Senate Intelligence Committee.",
    source: "Senate Intel Report Vol. 2 · Reuters · AP"
  },
  {
    handle: "LauraLoomer", label: "Extreme Misinformation", category: "misinformation",
    blocked: true, trust: 10,
    detail: "Laura Loomer has been banned from Twitter, Facebook, PayPal, Uber, Lyft, GoFundMe, and other platforms for spreading false and hateful content. Promoted multiple debunked conspiracy theories.",
    source: "NewsGuard · AP fact-checks"
  },
  {
    handle: "RebelNewsOnline", label: "Far-Right Outlet", category: "misinformation",
    blocked: true, trust: 26, country: "CA",
    detail: "Rebel News is a Canadian far-right outlet rated Red by NewsGuard. Has spread false claims about COVID vaccines, elections, and immigration with minimal correction rate.",
    source: "NewsGuard Red rating · Canadian Press"
  },
  {
    handle: "EzraLevant", label: "Far-Right Media Founder", category: "misinformation",
    blocked: true, trust: 22, country: "CA",
    detail: "Ezra Levant founded Rebel News and has repeatedly published content found defamatory or inaccurate by Canadian courts. Promotes anti-Muslim and anti-immigration conspiracy narratives.",
    source: "NewsGuard · Canadian court records"
  },
  {
    handle: "ThePostMillennial", label: "Far-Right Outlet", category: "misinformation",
    blocked: true, trust: 28, country: "CA",
    detail: "The Post Millennial is a Canadian right-wing outlet with a history of publishing misleading stories. Connected to American Conservative Union and Republican Party fundraising networks.",
    source: "NewsGuard · Canadian Anti-Hate Network"
  },
  {
    handle: "BlazeTV", label: "Partisan Commentary", category: "misinformation",
    blocked: true, trust: 30,
    detail: "Blaze TV is Glenn Beck's media network. Has spread false claims about COVID vaccines, elections, and climate change. NewsGuard rates it orange for multiple violations.",
    source: "NewsGuard · AP fact-checks"
  },
  {
    handle: "GlennBeck", label: "Conspiracy / Disinformation", category: "misinformation",
    blocked: true, trust: 22,
    detail: "Glenn Beck promoted multiple debunked conspiracy theories including Obama birther claims, Soros conspiracies, and false COVID vaccine claims. Lost Fox News contract over extremist content.",
    source: "PolitiFact · AP · Media Matters"
  },
  {
    handle: "marklevinshow", label: "Partisan Disinformation", category: "misinformation",
    blocked: true, trust: 28,
    detail: "Mark Levin has spread false claims about election fraud, COVID vaccines, and the January 6 investigation. Cited by multiple fact-checkers for repeated inaccuracies.",
    source: "PolitiFact · FactCheck.org"
  },
  {
    handle: "JamesOKeefeIII", label: "Deceptive Journalism", category: "misinformation",
    blocked: true, trust: 14,
    detail: "James O'Keefe's videos have been found deceptively edited in multiple investigations. Courts found Project Veritas liable for defamation in separate actions. Removed from his own organisation in 2023.",
    source: "AP · NYT investigation · Court records"
  },
  {
    handle: "Project_Veritas", label: "Deceptive Journalism", category: "misinformation",
    blocked: true, trust: 12,
    detail: "Project Veritas produces sting operations using deceptive editing. Multiple news organisations have found footage selectively cut to misrepresent subjects. Court defamation judgements.",
    source: "AP · WaPo investigations · Court records"
  },
  {
    handle: "RealCandaceO", label: "Partisan Misinformation", category: "misinformation",
    blocked: true, trust: 24,
    detail: "Candace Owens spread debunked claims about COVID vaccines and 2020 election fraud. Multiple posts flagged by Twitter/Meta community notes for inaccuracy.",
    source: "PolitiFact · Reuters fact-checks"
  },
  {
    handle: "CharlieKirk11", label: "Partisan Misinformation", category: "misinformation",
    blocked: true, trust: 26,
    detail: "Charlie Kirk (Turning Point USA) repeatedly spreads false claims about immigration statistics, election fraud, and campus policies. Documented by PolitiFact with multiple 'False' ratings.",
    source: "PolitiFact · FactCheck.org"
  },
  {
    handle: "TomiLahren", label: "Partisan Commentary", category: "misinformation",
    blocked: true, trust: 30,
    detail: "Tomi Lahren has spread false claims about crime statistics, immigration, and COVID. Content regularly receives Community Notes corrections.",
    source: "PolitiFact · AP fact-checks"
  },
  {
    handle: "dbongino", label: "Conspiracy / Disinformation", category: "misinformation",
    blocked: true, trust: 20,
    detail: "Dan Bongino repeatedly amplified false 2020 election fraud claims, COVID vaccine conspiracy theories, and deep state narratives. Parler owner known for coordinating with far-right networks.",
    source: "PolitiFact · FactCheck.org · AP"
  },
  {
    handle: "MattWalshBlog", label: "Extreme Disinformation", category: "misinformation",
    blocked: true, trust: 24,
    detail: "Matt Walsh (Daily Wire) has spread false information about trans healthcare, suicide statistics, and crime. PolitiFact and Reuters have fact-checked multiple false claims.",
    source: "PolitiFact · Reuters fact-checks"
  },
  {
    handle: "WNDNews", label: "Habitual Misinformation", category: "misinformation",
    blocked: true, trust: 10,
    detail: "WorldNetDaily (WND) receives a Red rating from NewsGuard for repeatedly publishing false or misleading claims. One of the first outlets to promote birther conspiracy theories about Obama.",
    source: "NewsGuard Red · PolitiFact · FactCheck.org"
  },
  {
    handle: "DailyCaller", label: "Low Reliability News", category: "misinformation",
    blocked: true, trust: 30,
    detail: "The Daily Caller has published multiple stories rated false by PolitiFact and FactCheck.org. Tucker Carlson co-founded it; editors have been linked to white nationalist publications.",
    source: "PolitiFact · Media Bias/Fact Check"
  },
  {
    handle: "townhallcom", label: "Partisan Outlet", category: "misinformation",
    blocked: true, trust: 30,
    detail: "Townhall.com is a conservative commentary website that has published articles rated false by multiple fact-checkers on immigration, crime, and COVID topics.",
    source: "PolitiFact · AFP fact-checks"
  },
  {
    handle: "PJMedia", label: "Partisan Outlet", category: "misinformation",
    blocked: true, trust: 28,
    detail: "PJ Media (formerly Pajamas Media) publishes commentary and reporting that regularly fails fact-checks. Media Bias/Fact Check rates it low for factual reporting.",
    source: "Media Bias/Fact Check · PolitiFact"
  },
  {
    handle: "AmericanThinker", label: "Partisan Outlet", category: "misinformation",
    blocked: true, trust: 26,
    detail: "American Thinker has published content that later required retractions, including false claims about Dominion Voting Systems. NewsGuard rates it red.",
    source: "NewsGuard Red · Dominion retraction"
  },
  {
    handle: "TheBlaze", label: "Partisan Disinformation", category: "misinformation",
    blocked: true, trust: 28,
    detail: "The Blaze (Glenn Beck media) has spread multiple false narratives about elections, COVID, and government overreach. Media Bias/Fact Check rates it low credibility.",
    source: "NewsGuard · Media Bias/Fact Check"
  },

  // ═══ GLOBAL STATE MEDIA ═══════════════════════════════════════════════════

  {
    handle: "DDNewsLive", label: "Indian State Media", category: "state-funded",
    blocked: false, trust: 50, country: "IN",
    detail: "Doordarshan News (DD News) is India's public state broadcaster, under Prasar Bharati (statutory body). Coverage favours government positions, especially on Pakistan, China, and domestic politics.",
    source: "Prasar Bharati Act 1990 · RSF India press freedom index"
  },
  {
    handle: "FanaBC", label: "Ethiopian State Media", category: "state-propaganda",
    blocked: true, trust: 20, country: "ET",
    detail: "Fana Broadcasting Corporate is majority state-owned and closely aligned with the Ethiopian government. Systematic pro-government coverage during the Tigray conflict.",
    source: "CPJ Ethiopia reports · RSF"
  },
  {
    handle: "ENA_Ethiopia", label: "Ethiopian State Agency", category: "state-propaganda",
    blocked: true, trust: 18, country: "ET",
    detail: "Ethiopian News Agency (ENA) is the official state news agency. Coverage consistently amplifies government narratives on conflicts and dissent.",
    source: "CPJ Ethiopia"
  },
  {
    handle: "VietnamPlus", label: "Vietnamese State Media", category: "state-propaganda",
    blocked: true, trust: 25, country: "VN",
    detail: "VietnamPlus is the online portal of the Vietnam News Agency (VNA), the official state news agency of the Socialist Republic of Vietnam. All editorial content is state-controlled.",
    source: "VNA Charter · RSF Vietnam press freedom index"
  },
  {
    handle: "VNA_Official", label: "Vietnamese State Agency", category: "state-propaganda",
    blocked: true, trust: 22, country: "VN",
    detail: "Vietnam News Agency (VNA) — official Vietnamese state news agency. Owned and directed by the Communist Party of Vietnam.",
    source: "VNA Charter"
  },
  {
    handle: "CubaVisionInt", label: "Cuban State TV", category: "state-propaganda",
    blocked: true, trust: 16, country: "CU",
    detail: "Cubavision Internacional is Cuba's international state television channel. All content is produced under direct Communist Party oversight.",
    source: "ICRT Cuba state media charter"
  },
  {
    handle: "NicaraguaGOBE", label: "Nicaraguan State Media", category: "state-propaganda",
    blocked: true, trust: 15, country: "NI",
    detail: "Nicaraguan government communications account. Since 2021, the Ortega government has shut down over 50 independent media outlets, making state media the primary information source.",
    source: "CPJ Nicaragua · RSF"
  },
  {
    handle: "RT_Deutsch", label: "Russian State Media (DE)", category: "state-propaganda",
    blocked: true, trust: 4, country: "RU",
    detail: "RT Deutsch — another German-language RT account. YouTube terminated RT DE in 2021 for COVID misinformation. EU banned RT from broadcasting in all member states in March 2022.",
    source: "EU Reg. 2022/350 · YouTube enforcement"
  },
  {
    handle: "SputnikBreaking", label: "Sputnik Breaking News", category: "state-propaganda",
    blocked: true, trust: 4, country: "RU",
    detail: "Sputnik breaking news account. Part of Rossiya Segodnya — same entity as SputnikInt and SptnkNE. Registered as foreign agent in the US.",
    source: "FARA · EU Reg. 2022/350"
  },
  {
    handle: "NKNewsOrg", label: "North Korea Monitor", category: "state-funded",
    blocked: false, trust: 58, country: "KP",
    detail: "NK News (NKNews.org) is a paid subscription service monitoring North Korea. Independent from the North Korean government — not state-controlled, but reports on NK state media outputs.",
    source: "NK News editorial policy"
  },
  {
    handle: "KCNA_Watch", label: "DPRK State Monitor", category: "state-funded",
    blocked: false, trust: 55, country: "KP",
    detail: "KCNA Watch aggregates official North Korean state media (KCNA) content for monitoring purposes. The account itself is independent but content is sourced directly from North Korean state propaganda.",
    source: "KCNA Watch editorial note"
  },
  {
    handle: "DiscloseTv", label: "Unverified Claims", category: "misinformation",
    blocked: false, trust: 20,
    detail: "Regularly posts unverified breaking news — especially during conflicts — without primary sources. Claims have been debunked by Reuters, AFP, and Bellingcat. Frequently amplified by Russian state media.",
    source: "Reuters fact-checks · Bellingcat"
  },
  {
    handle: "Warmonitors", label: "Unverified War Claims", category: "misinformation",
    blocked: false, trust: 22,
    detail: "Aggregates OSINT footage and casualty claims from conflict zones with no verification. No corrections record. Content has been reused by Russian state media.",
    source: "Bellingcat OSINT review"
  },
  {
    handle: "sentdefender", label: "Unverified Claims", category: "misinformation",
    blocked: false, trust: 28,
    detail: "SentinelDefender posts frequent military/conflict updates with varying accuracy. Disputed claims about Ukraine, Israel/Gaza, and Taiwan without subsequent corrections.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "OAN", label: "Low Reliability News", category: "misinformation",
    blocked: true, trust: 18,
    detail: "One America News Network. Rated Red by NewsGuard. Dropped by AT&T and DirecTV for misinformation. Repeatedly debunked by Reuters and AP.",
    source: "NewsGuard Red rating · Reuters fact-checks"
  },
  {
    handle: "TheChiefNerd", label: "Unverified Health / War Claims", category: "misinformation",
    blocked: false, trust: 24,
    detail: "Aggregates medical and conflict claims without peer-review or source verification. Posts labelled misleading by Community Notes.",
    source: "Community Notes (Twitter)"
  },

  // ═══ CONSPIRACY / FRINGE ══════════════════════════════════════════════════

  {
    handle: "RealAlexJones", label: "Conspiracy / InfoWars", category: "misinformation",
    blocked: true, trust: 5,
    detail: "Alex Jones was found liable for defamation by US courts for spreading false claims about the Sandy Hook massacre. Regularly promotes conspiracy theories about conflicts and governments.",
    source: "US Federal Court – Jones v. Pozner (2022)"
  },
  {
    handle: "NaturalNews", label: "Health / War Disinfo", category: "misinformation",
    blocked: true, trust: 4,
    detail: "Banned from Facebook, YouTube, and Pinterest for health misinformation. Also promotes conspiracy theories about geopolitical events.",
    source: "NewsGuard Red · CCDH report"
  },
  {
    handle: "EpochTimes", label: "Influence Network", category: "misinformation",
    blocked: true, trust: 16,
    detail: "Linked to Falun Gong. Identified by EU DisinfoLab and Oxford Internet Institute as a coordinated inauthentic influence network. Rated Red by NewsGuard.",
    source: "EU DisinfoLab 2019 · Oxford Internet Institute · NewsGuard"
  },

  // ═══ RUSSIAN / PRO-RUSSIA INFLUENCERS ════════════════════════════════════

  {
    handle: "jacksonhinklle", label: "Pro-Russia Influencer", category: "misinformation",
    blocked: true, trust: 8,
    detail: "Consistently amplifies Russian state narratives on Ukraine, Gaza, and US politics. Content reposted by RT and Sputnik. Multiple posts labelled misleading by Community Notes.",
    source: "Community Notes · NewsGuard · Bellingcat 2023"
  },
  {
    handle: "mylordbebo", label: "Pro-Russia Influencer", category: "misinformation",
    blocked: true, trust: 10,
    detail: "Lord Bebo amplifies Russian state media talking points on Ukraine, Gaza, and Western governments. Content routinely mirrors RT and Sputnik framing with no independent sourcing.",
    source: "Community Notes · EU DisinfoLab"
  },
  {
    handle: "megatron_ron", label: "Pro-Russia Influencer", category: "misinformation",
    blocked: true, trust: 10,
    detail: "Megatron promotes pro-Russian narratives on Ukraine and the Middle East. Content cited by Russian state media. Posts labelled misleading by Community Notes.",
    source: "Community Notes · Bellingcat"
  },

  // ═══ IRANIAN INFLUENCE OPERATIONS ════════════════════════════════════════

  {
    handle: "iranobserver0", label: "Iran-Linked Account", category: "state-propaganda",
    blocked: true, trust: 12, country: "IR",
    detail: "Account promotes Iranian state narratives on regional conflicts and opposes US/Israeli policy. Content pattern consistent with IRGC-linked influence operations.",
    source: "Community Notes · Stanford Internet Observatory"
  },
  {
    handle: "m_mahdibaba", label: "Iranian State-Linked", category: "state-propaganda",
    blocked: true, trust: 14, country: "IR",
    detail: "Posts content aligned with Iranian state media narratives on geopolitical conflicts. Amplifies IRGC-linked media sources.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "IRGC_IRAN_News", label: "IRGC Propaganda", category: "state-propaganda",
    blocked: true, trust: 5, country: "IR",
    detail: "Account operating in the name of Iran's Islamic Revolutionary Guard Corps. Promotes IRGC military operations, anti-Western narratives, and Iranian regime messaging.",
    source: "OFAC SDN list · Stanford Internet Observatory"
  },
  {
    handle: "IranIRGCC", label: "IRGC-Linked Account", category: "state-propaganda",
    blocked: true, trust: 5, country: "IR",
    detail: "Promotes Islamic Revolutionary Guard Corps messaging and Iranian regime narratives. Consistent with documented IRGC information operations.",
    source: "Community Notes · OFAC"
  },
  {
    handle: "Irantimes01", label: "Iranian State-Linked Media", category: "state-propaganda",
    blocked: true, trust: 12, country: "IR",
    detail: "Presents as an independent Iranian news account but amplifies Iranian state media framing on sanctions, regional conflicts, and anti-Western narratives.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "Irantimes02", label: "Iranian State-Linked Media", category: "state-propaganda",
    blocked: true, trust: 12, country: "IR",
    detail: "Sister account to Irantimes01. Amplifies Iranian government positions on the nuclear programme, sanctions, and regional conflicts.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "IranDefenceForc", label: "Iranian Military Propaganda", category: "state-propaganda",
    blocked: true, trust: 8, country: "IR",
    detail: "Posts content promoting Iranian military capabilities and IRGC operations. Amplifies regime messaging on proxy forces across the Middle East.",
    source: "Community Notes · Stanford Internet Observatory"
  },
  {
    handle: "IranUpdatesNow", label: "Iran State-Linked", category: "state-propaganda",
    blocked: true, trust: 14, country: "IR",
    detail: "Posts Iran-focused political content closely aligned with Iranian government narratives. Claims to provide 'updates' but sources consistently reflect IRIB/IRNA framing.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "troopwatchiran", label: "Unverified Iran Claims", category: "misinformation",
    blocked: true, trust: 22,
    detail: "Posts claims about Iranian military movements and proxy forces without verifiable sourcing. Content amplified by both pro-Iran and alarmist accounts before confirmation.",
    source: "Community Notes (Twitter)"
  },

  // ═══ CHINESE STATE MEDIA (additional handles) ════════════════════════════

  {
    handle: "cgtneurope", label: "Chinese State Media (EU)", category: "state-propaganda",
    blocked: true, trust: 22, country: "CN",
    detail: "CGTN Europe — EU bureau of China Global Television Network, controlled by the CCP's Propaganda Department. Continues operating after Ofcom revoked CGTN's UK broadcast licence in 2021.",
    source: "Ofcom 2021 · EU DisinfoLab"
  },
  {
    handle: "cgtnamerica", label: "Chinese State Media (US)", category: "state-propaganda",
    blocked: true, trust: 22, country: "CN",
    detail: "CGTN America — US bureau of China Global Television Network. Registered as a foreign agent under FARA. Identical editorial oversight as CGTNOfficial.",
    source: "FARA registration 2019"
  },
  {
    handle: "Eng_china5", label: "Chinese State-Linked", category: "state-propaganda",
    blocked: true, trust: 16, country: "CN",
    detail: "Posts pro-CCP content and amplifies Chinese state media narratives on Taiwan, Xinjiang, and Western criticism of China.",
    source: "Community Notes · EU DisinfoLab"
  },
  {
    handle: "XiZnping", label: "Xi Jinping Impersonation", category: "state-propaganda",
    blocked: true, trust: 5, country: "CN",
    detail: "Account impersonating or parodying Chinese leader Xi Jinping. Used to spread false attributions and pro-CCP narratives under a misleading handle.",
    source: "Community Notes (Twitter)"
  },

  // ═══ MULTI-STATE / BLOC PROPAGANDA ═══════════════════════════════════════

  {
    handle: "bricsinfo", label: "Bloc Propaganda", category: "state-propaganda",
    blocked: true, trust: 15,
    detail: "Promotes BRICS messaging that frequently amplifies Russian, Chinese, and Iranian state narratives on sanctions, the Ukraine war, and Western institutions.",
    source: "EU DisinfoLab · Community Notes"
  },
  {
    handle: "RussCan91", label: "Pro-Russia Account", category: "state-propaganda",
    blocked: true, trust: 12, country: "RU",
    detail: "Consistently amplifies Russian state media narratives on the Ukraine war, NATO, and Western sanctions. Content pattern consistent with Kremlin-aligned influence networks.",
    source: "Community Notes · Bellingcat"
  },

  // ═══ UNVERIFIED WAR / OSINT ACCOUNTS ═════════════════════════════════════

  {
    handle: "osintwarfare", label: "Unverified War Intel", category: "misinformation",
    blocked: false, trust: 28,
    detail: "Posts military intelligence and conflict claims without source verification. Content frequently amplified by state media before independent confirmation.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "rnintel", label: "Unverified Intel Claims", category: "misinformation",
    blocked: false, trust: 30,
    detail: "Posts conflict and intelligence claims from open sources. Accuracy varies significantly. No editorial standards or corrections policy.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "menchosint", label: "Unverified OSINT", category: "misinformation",
    blocked: false, trust: 32,
    detail: "OSINT aggregator posting conflict updates without verification. Content shared widely before accuracy can be confirmed.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "terror_alarm", label: "Unverified Terror Claims", category: "misinformation",
    blocked: false, trust: 25,
    detail: "Posts terror alerts and security incident claims, often before official confirmation. Has published false and retracted alerts. No corrections record.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "dd_geopolitics", label: "Unverified Geopolitics", category: "misinformation",
    blocked: false, trust: 26,
    detail: "Posts geopolitical and military updates citing unverified sources. Content frequently amplified by Russian and Iranian state media.",
    source: "Community Notes · Bellingcat"
  },
  {
    handle: "aq701", label: "Unverified Military Claims", category: "misinformation",
    blocked: false, trust: 28,
    detail: "Posts military and conflict claims from open sources without verification. Content has been amplified by state media actors.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "royalintel_", label: "Unverified Intel Claims", category: "misinformation",
    blocked: false, trust: 28,
    detail: "Posts geopolitical and intelligence claims without verifiable sources. Presents itself as an authoritative intelligence source without traceable credentials.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "middle_east_spectator", label: "Unverified ME Claims", category: "misinformation",
    blocked: false, trust: 30,
    detail: "Posts Middle East conflict updates without consistent source verification. Has spread unconfirmed casualty figures and battle claims.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "secretsqrl123", label: "Unverified Claims", category: "misinformation",
    blocked: true, trust: 25,
    detail: "Posts geopolitical and intelligence claims without verifiable sourcing.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "mossadil", label: "Unverified Intel Claims", category: "misinformation",
    blocked: false, trust: 20,
    detail: "Posts intelligence and security claims about the Middle East and Israel without verifiable sourcing. Presents content as authoritative intelligence leaks.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "firstsquawk", label: "Unverified Breaking News", category: "misinformation",
    blocked: true, trust: 28,
    detail: "Rapid-fire breaking news alerts, often posted before information can be verified. Some alerts have required subsequent retraction.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "WW3_Monitor", label: "Sensationalist War Content", category: "misinformation",
    blocked: true, trust: 15,
    detail: "Posts alarmist conflict escalation claims framed as imminent world war scenarios. Content amplifies unverified reports and spreads before confirmation by credible outlets.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "intelFromBrian", label: "Unverified Intel Claims", category: "misinformation",
    blocked: true, trust: 22,
    detail: "Posts 'intelligence' and conflict claims without verifiable sources or traceable credentials. Presents speculation as confirmed intel.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "ME_Observer_", label: "Unverified ME Claims", category: "misinformation",
    blocked: true, trust: 25,
    detail: "Posts Middle East conflict updates without consistent source verification. Claims frequently circulate before independent confirmation.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "MEC_Tracker", label: "Unverified Conflict Tracker", category: "misinformation",
    blocked: true, trust: 24,
    detail: "Posts Middle East conflict tracking data from open sources without editorial verification. Has spread unconfirmed casualty and strike claims.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "GlobalNewsHQI", label: "Unverified Breaking News", category: "misinformation",
    blocked: true, trust: 20,
    detail: "Posts rapid-fire breaking news claims across multiple conflict zones without source verification. Content has been disputed by subsequent mainstream reporting.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "USarmypwr", label: "Unverified Military Claims", category: "misinformation",
    blocked: true, trust: 20,
    detail: "Posts claims about US military operations and power without traceable sourcing. Not affiliated with the official US Army. Content frequently lacks context.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "24_70xu", label: "Unverified Claims", category: "misinformation",
    blocked: true, trust: 18,
    detail: "Posts geopolitical and conflict claims without verifiable sources. Content amplified by state-linked accounts.",
    source: "Community Notes (Twitter)"
  },

  // ═══ PARTISAN COMMENTATORS ════════════════════════════════════════════════

  {
    handle: "benshapiro", label: "Partisan Commentary", category: "misinformation",
    blocked: true, trust: 35,
    detail: "The Daily Wire, co-founded by Shapiro, is rated low factual reporting by MBFC. Posts regularly contain misleading framing on LGBTQ+ issues, climate, and elections.",
    source: "Media Bias/Fact Check · PolitiFact · Community Notes"
  },
  {
    handle: "timcast", label: "Unverified Claims", category: "misinformation",
    blocked: false, trust: 22,
    detail: "Tim Pool regularly posts political claims without source verification. Multiple posts have been labelled misleading by Community Notes. Has spread election fraud narratives.",
    source: "Community Notes · NewsGuard"
  },
  {
    handle: "libsoftiktok", label: "Targeted Misinformation", category: "misinformation",
    blocked: true, trust: 18,
    detail: "Libs of TikTok has repeatedly doxed educators and healthcare workers, leading to documented harassment campaigns. Multiple temporary suspensions across platforms.",
    source: "Washington Post investigation 2022 · CCDH report"
  },
  {
    handle: "cobratate", label: "Conspiracy / Fringe", category: "misinformation",
    blocked: true, trust: 12,
    detail: "Andrew Tate spreads misogynistic narratives and conspiracy theories. Banned from YouTube, Facebook, Instagram, and TikTok. Posts frequently receive Community Notes corrections.",
    source: "Community Notes · CCDH report 2022"
  },
  {
    handle: "gunthereagleman", label: "Unverified Claims", category: "misinformation",
    blocked: true, trust: 20,
    detail: "Posts political and health claims that frequently lack sourcing. Multiple posts have received Community Notes corrections for factual inaccuracies.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "elonmusk", label: "Unverified Claims", category: "misinformation",
    blocked: true, trust: 30,
    detail: "Frequently posts unverified claims and political misinformation. Multiple posts have received Community Notes corrections. As owner of X, posts receive outsized algorithmic amplification.",
    source: "Community Notes · PolitiFact · AP Fact Check"
  },
  {
    handle: "mark_slapinski", label: "Far-Right Misinformation", category: "misinformation",
    blocked: true, trust: 14, country: "CA",
    detail: "Canadian far-right commentator who spreads anti-immigration, anti-Muslim, and anti-LGBTQ+ content. Posts regularly flagged by Community Notes for factual inaccuracies.",
    source: "Community Notes · Canadian Anti-Hate Network"
  },
  {
    handle: "MarioNawfal", label: "Unverified Breaking News", category: "misinformation",
    blocked: true, trust: 18,
    detail: "Hosts X Spaces and posts breaking news claims at high speed without editorial verification. Repeatedly cited for spreading false or premature information during major news events.",
    source: "Community Notes · Reuters fact-checks"
  },
  {
    handle: "ShaykhSulaiman", label: "Unverified Claims", category: "misinformation",
    blocked: true, trust: 22,
    detail: "Posts religious and geopolitical content that frequently contains unverified claims about conflicts in the Muslim world. Content has been labelled misleading by Community Notes.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "MrImranPk", label: "Partisan Commentary", category: "misinformation",
    blocked: true, trust: 24, country: "PK",
    detail: "Posts pro-PTI (Pakistan Tehreek-e-Insaf) commentary and political claims. Content frequently contains misleading framing about Pakistani government and military actions.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "Netanyahu_News", label: "Unofficial / Unverified", category: "misinformation",
    blocked: true, trust: 10,
    detail: "Unofficial account claiming to report news about Israeli Prime Minister Netanyahu. Not affiliated with the Israeli government or official press office. Spreads unattributed political claims.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "trumps_kitten", label: "Partisan Misinformation", category: "misinformation",
    blocked: true, trust: 12,
    detail: "Posts MAGA-aligned content including false claims about elections, immigration, and political opponents. Multiple posts labelled misleading by Community Notes.",
    source: "Community Notes (Twitter)"
  },

  // ═══ ALTERNATIVE / ADVOCACY MEDIA ════════════════════════════════════════

  {
    handle: "dropsitenews", label: "Unverified Claims", category: "misinformation",
    blocked: true, trust: 30,
    detail: "Publishes leaked documents and conflict claims without consistent editorial verification. Some content has been disputed by subsequent mainstream reporting.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "euromaidanpr", label: "Ukrainian Nationalist Media", category: "state-propaganda",
    blocked: true, trust: 30, country: "UA",
    detail: "EuroMaidan PR promotes exclusively pro-Ukrainian government narratives. All Russian sources treated as false and Ukrainian government claims as fact, without independent verification.",
    source: "EU DisinfoLab · Bellingcat media audit"
  },
  {
    handle: "in2thinair", label: "Conspiracy / Fringe", category: "misinformation",
    blocked: true, trust: 10,
    detail: "Posts conspiracy theories about governments, vaccines, the New World Order, and geopolitical events without credible sourcing.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "uk_rept", label: "Unverified Claims", category: "misinformation",
    blocked: false, trust: 25,
    detail: "Posts UK and European political commentary without consistent source verification. Claims disputed by mainstream fact-checkers.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "gbpolitcs", label: "Unverified Claims", category: "misinformation",
    blocked: false, trust: 28,
    detail: "Posts UK political commentary and news claims. Multiple posts labelled misleading by Community Notes for factual inaccuracies.",
    source: "Community Notes (Twitter)"
  },
  {
    handle: "nyprepper1", label: "Conspiracy / Fringe", category: "misinformation",
    blocked: true, trust: 15,
    detail: "Posts prepper and conspiracy content including unverified claims about government crises, collapse scenarios, and false flag events.",
    source: "Community Notes (Twitter)"
  },

  // ═══ SATIRE ═══════════════════════════════════════════════════════════════

  {
    handle: "TheOnion", label: "Satire", category: "satire",
    blocked: true, trust: 100,
    detail: "The Onion is a long-running satirical publication. All content is intentionally fictional. Flagged only to prevent viral spread during breaking news.",
    source: "The Onion, Inc."
  },
  {
    handle: "TheBabylonBee", label: "Satire", category: "satire",
    blocked: false, trust: 100,
    detail: "The Babylon Bee is a conservative satirical publication. Fictional content. Snopes and Meta have reviewed headlines that went viral as real news.",
    source: "Snopes · Meta misinformation reviews"
  },
  {
    handle: "ClickHole", label: "Satire", category: "satire",
    blocked: false, trust: 100,
    detail: "ClickHole (Onion subsidiary) parodies viral content. Intentionally absurd — not factual.",
    source: "The Onion, Inc."
  },
  {
    handle: "ThePoke", label: "Satire", category: "satire",
    blocked: false, trust: 100,
    detail: "The Poke is a British satirical website. Content is not factual news.",
    source: "ThePoke.co.uk"
  },
  {
    handle: "WaterfordWhispers", label: "Satire", category: "satire",
    blocked: false, trust: 100,
    detail: "Irish satirical site. Several headlines were shared as real news in Eastern European media ecosystems during the Ukraine conflict.",
    source: "EU vs Disinformation"
  }
];
