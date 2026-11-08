# =====================================================================
#  site_data.R  —  data behind the Synroc website (SCPU3001 / ANSTO)
#
#  Everything the website shows comes from this file. To test confidential
#  data (e.g. a producer's measured volume), change it here and re-render
#  locally; nothing leaves your computer unless you publish the site.
#
#  Everything the website shows comes from this file. The inputs mirror
#  synroc_model.R (the report's model), so if the team changes a score,
#  a volume or a risk rating here and re-renders, every chart updates.
#
#  Only base R + jsonlite are needed.
# =====================================================================

build_site_data <- function(n_draws = 10000, seed = 2026) {

  ## ---------- Jurisdictions (report Table 1, Table 2) ------------------
  ## The eight cases were chosen to test the screen, not to confirm a
  ## favourite: every fission Mo-99 producer in the Commonwealth and the EU,
  ## plus each jurisdiction a single-criterion search would have picked.
  countries <- data.frame(
    id     = c("NL", "BE", "ZA", "CA", "UK", "FR", "EU", "AU"),
    name   = c("Netherlands", "Belgium", "South Africa", "Canada",
               "United Kingdom", "France", "EU framework", "Australia"),
    bloc   = c("EU", "EU", "Commonwealth", "Commonwealth",
               "Commonwealth", "EU", "EU", "Benchmark"),
    why    = c("Fission Mo-99 producer: Curium, Petten",
               "Fission Mo-99 producer: IRE, Fleurus",
               "Fission Mo-99 producer: NTP, Pelindaba",
               "Largest inventory: about 40% of world Mo-99 until 2016, and our plan's lead case",
               "Readiest regulator: assesses new wasteforms early and has run HIP trials on its own waste",
               "Future Mo-99 producer (Jules Horowitz Reactor)",
               "Shared rules for the three EU cases",
               "ANSTO's own waste stream and plant"),
    stream = c("Matching waste; disposal paid on hand-over",
               "Matching waste; documented volume",
               "Matching waste; no volume or cost data",
               "Now non-fission; disposal decades away",
               "No isotope stream; other waste does not pay",
               "No current stream; national vitrification industry",
               "Sets duties, not wasteform criteria",
               "Reference formulation; SyMo still commissioning"),
    stage1 = c("Proceeds: first", "Proceeds: second", "Evidence gap", "Excluded (Darlington: data gap)",
               "Excluded", "Revisit later", "Legal baseline", "Benchmark"),
    legal  = c(3, 3, 3, 3, 4, 3, NA, 4),
    political = c(5, 4, 2, 3, 4, 2, NA, 3),
    site   = c("Curium, Petten · COVRA, Nieuwdorp",
               "IRE, Fleurus · ONDRAF / Belgoprocess, Dessel",
               "NTP, Pelindaba",
               "Chalk River resins and sludges (excluded) · Darlington, non-fission Mo-99 (data gap)",
               "Resins and sludges only",
               "No current producer",
               "Directive 2011/70/Euratom",
               "ANSTO, Lucas Heights (SyMo)"),
    note   = c("Liquid waste from fission Mo-99. COVRA takes ownership and liability at hand-over for a one-off charge and stores the waste until disposal, foreseen around 2130, so every cubic metre avoided saves the full charge.",
               "Same process family as Petten; about 3.2 m³ a year in 1985–96, when Belgoprocess, ONDRAF's operator, processed IRE's liquid waste. Uranium recovery (RECUMO) may change which stream remains.",
               "Same process family, so the chemistry fits, but there are no public volume or cost data, and the regulator halted NTP for about a year. Held in the evidence-gap register until it can be costed.",
               "The obvious first pick by inventory size, and our plan's lead case. But Canada now makes Mo-99 without fission, leaving no comparable liquid waste, and its repository is decades away, so the avoided cost is heavily discounted.",
               "The obvious first pick by regulatory readiness: the only regulator that assesses a new wasteform before a repository exists. But it has no isotope waste stream, and its resins and sludges pay only at about 240 m³ a year.",
               "A future Mo-99 producer, but no current stream, and it backs its own vitrification industry (La Hague). Revisit when production starts.",
               "Not a market but the shared rulebook for the Netherlands, Belgium and France. It sets the duty to license facilities and dispose of waste at home, but leaves wasteform acceptance to national agencies, so ANSTO must engage each agency.",
               "ANSTO's own stream sets the reference formulation. SyMo is still being commissioned, and the national waste site at Kimba was set aside in 2023."),
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

  ## ---------- Why the Netherlands ranks first (report Section 3.7) ------
  ## Gap V(NL) - V(BE) = w1 + w2 + 0.5 w3 under each random weighting
  gap <- as.vector(W %*% (X["NL", ] - X["BE", ]))
  brk <- seq(0, 1, by = 0.05)
  gap_hist <- as.vector(table(cut(pmin(gap, 1 - 1e-9), brk, right = FALSE)))
  ## Scores are judgements: add an independent uniform error of +/-e to every
  ## score, alongside uniform weights, and count how often NL stays first
  perturb <- sapply(c(0.5, 1), function(e) {
    set.seed(seed)
    Wp <- matrix(rgamma(n_draws * 4, shape = 1), ncol = 4)
    Wp <- Wp / rowSums(Wp)
    E1 <- matrix(runif(n_draws * 4, -e, e), ncol = 4)
    E2 <- matrix(runif(n_draws * 4, -e, e), ncol = 4)
    v1 <- rowSums(Wp * (matrix(X["NL", ], n_draws, 4, byrow = TRUE) + E1))
    v2 <- rowSums(Wp * (matrix(X["BE", ], n_draws, 4, byrow = TRUE) + E2))
    mean(v1 > v2)
  })
  robust <- list(
    gap_min = min(gap), gap_median = median(gap), share_positive = mean(gap > 0),
    gap_hist = gap_hist, gap_breaks = brk,
    perturb_half = perturb[1], perturb_one = perturb[2],
    threshold = 0.75,
    ## stress thresholds (report Table B3): fall in volume before failing Stage 1
    stress_nl = 1 - 0.5 / 0.7, stress_be = 1 - 1.0 / 3.2
  )

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
             "Dutch volume unverified or falls below break-even",
             "Non-reactor Mo-99 capacity displaces European fission output",
             "RECUMO removes or relocates IRE's liquid ILW",
             "No operating reference plant while ANSTO sells",
             "Shared alkaline formulation fails on licensee waste",
             "Licensee first-plant cost overrun",
             "Repository programmes slip or reverse",
             "Service model blocked",
             "Technology-transfer conditions",
             "Licensor warranty liability",
             "IP leakage to competing Mo-99 producers",
             "Revenue concentration",
             "Trust at Petten after the 2025 enforcement order",
             "Trust at Fleurus after the 2008 release"),
    L  = c(3, 3, 2, 2, 2, 3, 2, 2, 3, 3, 1, 2, 2, 3, 2, 2),
    I  = c(3, 2, 3, 3, 3, 3, 3, 3, 1, 1, 2, 2, 2, 2, 2, 2),
    RL = c(2, 2, 2, 2, 2, 3, 1, 2, 3, 3, 1, 1, 1, 3, 2, 2),
    RI = c(3, 2, 3, 3, 3, 3, 3, 2, 1, 1, 1, 2, 2, 1, 2, 2),
    response = c("Approach agencies as licensees; acceptance and tariff as licence conditions (G2)",
                 "Savings-share licence priced on the agency's avoided cost",
                 "Measure the volume during characterisation (G1)",
                 "Retain and monitor; minimum annual payment (R14)",
                 "Characterise RECUMO residues within G1",
                 "Sign only after the ARPANSA operating licence (G3)",
                 "Simulant trials; re-tailor the formulation (G1)",
                 "Reuse existing cells; fixed-price engineering package",
                 "Retain and monitor",
                 "Avoid: licensing is recommended instead",
                 "Confirm scope early with the Commission and member states",
                 "Limit warranties to the G1-G2 specification",
                 "License to agencies; staged know-how release",
                 "Upfront fee and minimum annual payment",
                 "Engage COVRA and Curium before contracts",
                 "Engage before contracts; publish evidence"),
    stringsAsFactors = FALSE
  )

  list(countries = countries, scores = scores, smaa = smaa, robust = robust,
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
