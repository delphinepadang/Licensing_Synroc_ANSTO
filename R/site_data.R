# =====================================================================
#  site_data.R  —  data behind the Synroc website (SCPU3001 / ANSTO)
#
#  Everything the website shows comes from this file. The inputs mirror
#  synroc_model.R (the report's model), so if the team changes a score,
#  a volume or a risk rating here and re-renders, every chart updates.
#
#  Only base R + jsonlite are needed.
# =====================================================================

build_site_data <- function(n_draws = 10000, seed = 2026) {

  ## ---------- Jurisdictions (RQ1 stream, RQ3 legal + political) ------
  countries <- data.frame(
    id     = c("NL", "BE", "ZA", "AU", "CA", "UK", "FR", "NZ"),
    name   = c("Netherlands", "Belgium", "South Africa", "Australia",
               "Canada", "United Kingdom", "France", "New Zealand"),
    bloc   = c("EU", "EU", "Commonwealth", "Benchmark",
               "Commonwealth", "Commonwealth", "EU", "Commonwealth"),
    stream = c("Matching: liquid waste from fission Mo-99",
               "Matching: liquid waste from fission Mo-99",
               "Matching, but no public volume data",
               "Reference stream (ANSTO)",
               "No matching waste", "No matching waste",
               "No producer operating yet", "No matching waste"),
    stage1 = c("Potential market", "Potential market", "No waste data", "Benchmark",
               "No matching waste", "No matching waste", "Revisit later", "No matching waste"),
    legal  = c(3, 3, 3, 4, 3, 4, 3, 1),
    political = c(5, 4, 2, 3, 3, 4, 2, 1),
    site   = c("Curium, Petten · COVRA, Nieuwdorp",
               "IRE, Fleurus · ONDRAF / Belgoprocess, Dessel",
               "NTP, Pelindaba",
               "ANSTO, Lucas Heights (SyMo)",
               "Darlington (neutron capture)",
               "Resins and sludges only",
               "No current producer",
               "No candidate stream"),
    note   = c("Liquid waste from fission Mo-99. COVRA takes ownership at hand-over for a one-off charge and stores it until disposal, foreseen around 2130, so every cubic metre avoided saves the full charge.",
               "Same process family as Petten; about 3.2 m³ a year in 1985–96. Uranium recovery (RECUMO) may change which stream remains.",
               "Same process family, but no volume data, a repository around 2065 and a regulator that halted production for about a year.",
               "ANSTO's own plant, SyMo, is being commissioned. The national waste site at Kimba was abandoned in 2023.",
               "Darlington's Mo-99 route leaves no comparable liquid waste, and the ILW repository is unsited, so avoided costs are decades away.",
               "The only regulator with a staged process to assess a new wasteform before a repository exists, but no isotope waste stream.",
               "Backs its own vitrification industry (La Hague); no current Mo-99 producer.",
               "Licensing route undefined and a nuclear-free identity; no isotope waste stream."),
    stringsAsFactors = FALSE
  )
  countries$rq3 <- (countries$legal + countries$political) / 2

  ## ---------- Stage 2 scores for the survivors (1-5) ------------------
  ## rq3 = mean of legal and political, as in synroc_model.R
  scores <- data.frame(
    id  = c("NL", "BE", "ZA"),
    rq1 = c(3, 2, 3),
    rq2 = c(5, 4, NA),          # ZA economic score not yet modelled
    rq3 = c(4, 3.5, 2.5),
    rq4 = c(3, 3, 3)
  )

  ## ---------- SMAA-2: rank acceptability under random weights ----------
  set.seed(seed)
  X <- as.matrix(scores[!is.na(scores$rq2), c("rq1", "rq2", "rq3", "rq4")])
  rownames(X) <- scores$id[!is.na(scores$rq2)]
  W <- matrix(rgamma(n_draws * 4, shape = 1), ncol = 4)
  W <- W / rowSums(W)                          # uniform over the simplex
  V <- W %*% t(X)
  first <- colnames(V)[apply(V, 1, which.max)]
  smaa <- as.list(table(factor(first, levels = rownames(X))) / n_draws)

  ## ---------- Economics (RQ2, Monte Carlo medians from the report) -----
  econ <- data.frame(
    id = c("NL", "BE"),
    name = c("Netherlands (COVRA)", "Belgium (ONDRAF)"),
    saving_per_m3 = c(2.7, 1.4),     # A$ million per m³ of raw waste, median
    breakeven = c(0.5, 1.0),         # m³/yr at which licensing pays
    volume = c(0.7, 3.2),            # m³/yr, estimate (NL) / 1985-96 record (BE)
    p_cheaper = c(0.96, 0.81),       # share of 20,000 scenarios
    stringsAsFactors = FALSE
  )

  ## ---------- Risk register (1 Low, 2 Medium, 3 High) -----------------
  risks <- data.frame(
    id   = paste0("R", 1:16),
    risk = c("Agency declines to adopt Synroc or re-prices its product",
             "Saving does not reach the payer",
             "Dutch volume unverified or below break-even",
             "Non-reactor Mo-99 displaces fission output",
             "RECUMO removes or relocates IRE's liquid ILW",
             "No operating reference plant",
             "Shared formulation fails on licensee waste",
             "Licensee first-plant cost overrun",
             "Repository programmes slip",
             "Service model blocked",
             "Technology-transfer conditions",
             "Licensor warranty liability",
             "IP leakage to competing producers",
             "Revenue concentration",
             "Trust at Petten after 2025 enforcement",
             "Trust at Fleurus after 2008 release"),
    L  = c(3, 3, 2, 2, 2, 3, 2, 2, 3, 3, 1, 2, 2, 3, 2, 2),
    I  = c(3, 2, 3, 3, 3, 3, 3, 3, 1, 1, 2, 2, 2, 2, 2, 2),
    RL = c(2, 2, 2, 2, 2, 3, 1, 2, 3, 3, 1, 1, 1, 3, 2, 2),
    RI = c(3, 2, 3, 3, 3, 3, 3, 2, 1, 1, 1, 2, 2, 1, 2, 2),
    response = c("Approach agencies as licensees; acceptance and tariff as licence conditions (G2)",
                 "Savings-share licence priced on the agency's avoided cost",
                 "Measure the volume during characterisation (G1)",
                 "Monitor; minimum annual payment",
                 "Characterise RECUMO residues within G1",
                 "Sign only after the ARPANSA operating licence (G3)",
                 "Simulant trials; re-tailor the formulation (G1)",
                 "Reuse existing cells; fixed-price engineering package",
                 "Monitor",
                 "None needed; licensing recommended",
                 "Confirm scope early; local partner",
                 "Limit warranties to the G1-G2 specification",
                 "License to agencies; staged know-how release",
                 "Upfront fee and minimum annual payment",
                 "Engage COVRA and Curium before contracts",
                 "Engage before contracts; publish evidence"),
    stringsAsFactors = FALSE
  )

  list(countries = countries, scores = scores, smaa = smaa,
       n_draws = n_draws, econ = econ, risks = risks,
       discount_rate = 0.035)
}

## Writes the data as a JSON <script> tag that the page's JavaScript reads.
site_data_tag <- function(...) {
  json <- jsonlite::toJSON(build_site_data(...), dataframe = "rows",
                           auto_unbox = TRUE, na = "null", digits = 6)
  ## escape non-ASCII characters so the tag is safe in any locale
  chars <- strsplit(enc2utf8(as.character(json)), "")[[1]]
  codes <- vapply(chars, utf8ToInt, integer(1))
  chars[codes > 127] <- sprintf("\\u%04x", codes[codes > 127])
  sprintf('<script id="synroc-data" type="application/json">%s</script>',
          paste(chars, collapse = ""))
}
