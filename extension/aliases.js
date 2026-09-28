// Balloon — cross-platform handle aliases.
// Maps a normalised Instagram / Facebook / YouTube handle (lowercase, no
// punctuation) to the Twitter handle used as the key in BALLOON_ACCOUNTS.
// Handles that are identical across platforms need no entry — the lookup
// already matches normalised handles directly.

const BALLOON_ALIASES = {
  // Russian state media
  "rt":                 "RT_com",
  "rtnews":             "RT_com",
  "rtcom":              "RT_com",
  "rtenglish":          "RT_com",
  "sputnik":            "SputnikInt",
  "sputniknews":        "SputnikInt",
  "sputnikglobe":       "SputnikInt",
  "tass":               "tass_agency",
  "tassagency":         "tass_agency",
  "rianovosti":         "RiaNovsoti",
  "redfish":            "Redfishstream",
  "redfishmedia":       "Redfishstream",

  // Chinese state media
  "cgtn":               "CGTNOfficial",
  "cgtnenglish":        "CGTNOfficial",
  "xinhua":             "XinhuaNewsEN",
  "xinhuanews":         "XinhuaNewsEN",
  "xinhuanewsagency":   "XinhuaNewsEN",
  "chinaxinhuanews":    "ChinaXinhuaEN",
  "globaltimes":        "globaltimesnews",
  "peopledaily":        "PDChina",
  "peoplesdaily":       "PDChina",
  "peoplesdailychina":  "PDChina",
  "cctv":               "CCTVNews",

  // Iranian / aligned
  "presstvnews":        "PressTV",
  "presstvofficial":    "PressTV",
  "hispantvenglish":    "HispanTV",
  "almayadeen":         "AlMayadeen_en",
  "almayadeenenglish":  "AlMayadeen_en",
  "tasnim":             "TasnimNews",
  "farsnews":           "FarsNewsAgency",

  // Latin America
  "telesur":            "teleSURtv",
  "telesurenglish":     "teleSURtv",

  // Other flagged outlets
  "aljazeera":          "AJEnglish",
  "aljazeeraenglish":   "AJEnglish",
  "epochtimes":         "EpochTimes",
  "theepochtimes":      "EpochTimes",
  "infowars":           "RealAlexJones",
  "alexjones":          "RealAlexJones",
  "breitbart":          "BreitbartNews",
  "oann":               "OAN",
  "oneamericanews":     "OAN",
  "newsmaxmedia":       "Newsmax",
  "tuckercarlsonnetwork": "TuckerCarlson",
  "candaceowens":       "RealCandaceO",
  "realcandaceowens":   "RealCandaceO",
  "thegrayzone":        "GrayzoneNews",
  "grayzone":           "GrayzoneNews"
};
