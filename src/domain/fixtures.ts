/**
 * The worked example as a real object.
 *
 * Doubles as the golden reference for generated output and as proof that the
 * schema is actually inhabitable — a schema no valid brief can satisfy is a
 * schema nobody finds out about until the generator starts failing.
 */

import type { DecompositionBrief } from "./brief";
import { createClock } from "./clock";
import { computeCoverage, TRACK_TOPICS, type TopicId } from "./coverage";

const clock = createClock("full_60");

export const CINEMA_BRIEF: DecompositionBrief = {
  id: "cinema-seat-utilisation",
  briefVersion: 3,
  rawAsk: "We want to analyze seat utilization and recommend better showtimes.",
  restatement:
    "Change the showtime schedule so auditoriums run fuller. Two deliverables hide in that sentence: a measurement system for what utilisation is today, and a decision system for what the schedule should be.",
  companyMode: "deep_dive",

  clock: {
    preset: clock.preset,
    totalMinutes: clock.totalMinutes,
    segments: clock.segments.map((s) => ({
      segment: s.segment,
      budgetMinutes: s.budgetMinutes,
      elapsedMinutes: s.elapsedMinutes,
      overranBy: s.overranBy,
      posture: s.posture,
    })),
    minutesRemaining: clock.minutesRemaining,
    debtMinutes: clock.debtMinutes,
  },

  decomposition: {
    triage: {
      namedEntity: "the exhibitor — 'we', presumably a regional chain",
      actualStakeholder: "the regional programmer who publishes the weekly grid",
      stakeholderGap:
        "The exec asking feels the revenue pain; the programmer's behaviour is what has to change. Design for the exec and nothing ships.",
      stakeholderConfidence: "must_confirm",
      resourcesGiven: ["POS/ticketing data (implied, not stated)"],
      resourcesToAskFor: [
        {
          resource: "distributor contract terms",
          whyItWouldHelp:
            "Minimum-showings clauses are hard constraints; breaching one is worse than useless.",
          askThisWay: "Are there contractual minimums per title we'd have to respect?",
        },
        {
          resource: "local events and school term dates",
          whyItWouldHelp: "Dominates the highest-value days.",
          askThisWay: "Do we have anything on local events or term calendars?",
        },
        {
          resource: "seating-plan system",
          whyItWouldHelp: "POS capacity goes stale after refurbishment.",
          askThisWay: "Where does authoritative seat count per screen live?",
        },
      ],
      timeBound: { value: "one week", source: "must_ask" },
      openingQuestions: [
        {
          question: "Who sets the schedule today, and would they use this?",
          targets: "stakeholder",
          whyItMatters: "Their behaviour is the only lever that changes anything.",
          },
        {
          question: "What's the window to ship something?",
          targets: "time_bound",
          whyItMatters: "Decides whether this is a report or a system.",
        },
        {
          question: "Are contractual minimums in play?",
          targets: "resources",
          whyItMatters: "A hard constraint that invalidates recommendations if missed.",
        },
        {
          question: "Is pricing in scope, or fixed?",
          targets: "success",
          whyItMatters: "Decides whether yield optimisation is even available.",
        },
      ],
    },

    painPoint: {
      candidates: [
        { painPoint: "revenue per screen-hour is below plan", forWhom: "the exec" },
        { painPoint: "the programmer is guessing at the grid", forWhom: "the programmer" },
        { painPoint: "no idea which showings to promote", forWhom: "marketing" },
      ],
      chosen: "the programmer is guessing at the grid",
      whyThisOne:
        "They own the decision, and theirs is the only behaviour whose change moves the metric.",
      currentWorkaround: {
        whatTheyDoToday:
          "Copy last week's grid and adjust by gut, distributor pressure, and a spreadsheet of last week's per-showing sales.",
        whereTimeIsActuallyLost:
          "Not analysis time — there is no per-daypart view and no way to sanity-check a grid before publishing. Once it's out, a bad week is a bad week.",
        questionsThatRevealIt: [
          "Walk me through how next week's grid actually gets made.",
          "When you move a showtime, how do you find out whether it worked?",
        ],
      },
      reframe: {
        broad: "seat utilisation is low",
        sharpened:
          "the programmer cannot test a proposed grid before publishing it, and has no per-daypart load signal to test it against",
        whatThisChangesDownstream:
          "The ask implies an optimiser. The reframe says decision support — materially cheaper, faster and more adoptable. It is the difference between shipping in a week and shipping in a quarter.",
      },
    },

    solution: {
      id: "solution",
      question: "What do we actually build?",
      options: [
        {
          id: "A",
          label: "Truth set + weekly daypart report",
          detail: "Measure utilisation properly and report it. No recommendation.",
          optimizesFor: "visibility",
          usesResources: ["POS/ticketing data"],
          requiresUnlistedResource: null,
          effort: "S",
          recommended: false,
          rationale: "Necessary groundwork, but it optimises nothing on its own.",
        },
        {
          id: "B",
          label: "Truth set + what-if checker",
          detail:
            "The programmer proposes a change; the system returns a predicted load factor for it.",
          optimizesFor: "decision confidence before publishing",
          usesResources: ["POS/ticketing data", "capacity reference"],
          requiresUnlistedResource: {
            resource: "distributor contract terms",
            askThisWay: "Are there contractual minimums we'd need to respect?",
            fallbackIfNo: "Ship without constraint checking and flag it as a known gap.",
          },
          effort: "M",
          recommended: true,
          rationale:
            "The reframe points here: the pain is not being able to check before committing, not the absence of an optimum.",
        },
        {
          id: "C",
          label: "Constrained optimiser",
          detail: "Generate the grid automatically under hard constraints.",
          optimizesFor: "the theoretically best grid",
          usesResources: ["POS/ticketing data", "contract terms", "staff rosters"],
          requiresUnlistedResource: {
            resource: "staff rosters",
            askThisWay: "Could we get crew availability per site?",
            fallbackIfNo: "Recommendations may be unstaffable, which kills trust immediately.",
          },
          effort: "L",
          recommended: false,
          rationale:
            "Solves a problem the programmer did not report, and will be distrusted in week one.",
        },
        {
          id: "D",
          label: "Screen and format allocation",
          detail: "Decide which titles get which screens at all, upstream of showtimes.",
          optimizesFor: "portfolio mix",
          usesResources: ["booking data", "POS/ticketing data"],
          requiresUnlistedResource: {
            resource: "booking data",
            askThisWay: "Is title booking in scope, or someone else's decision?",
            fallbackIfNo: "Out of scope — but worth naming as the possible real lever.",
          },
          effort: "L",
          recommended: false,
          rationale:
            "Worth raising even though we are not picking it: if the wrong titles are on the wrong screens, showtimes are the wrong lever entirely.",
        },
      ],
      selectedId: "B",
      userOverride: null,
    },

    concreteObjective:
      "Build a utilisation truth set at showing grain, compute load factor by daypart and revenue per screen-hour, and let the programmer test a proposed grid change against it before publishing — delivered into their existing weekly workflow.",

    metrics: [
      {
        name: "Load factor by daypart",
        kind: "primary",
        definition: "tickets sold ÷ seating capacity, grouped by theatre and daypart",
        baseline: {
          value: null,
          howEstablished: "~8 weeks of POS history at showing grain",
          confidence: "must_measure_first",
        },
        target: {
          value: "+4pp on weekday matinee",
          basis: "the worst-performing daypart, so the cheapest place to prove the idea",
        },
        guardrail: {
          metric: "total admissions",
          threshold: "must not fall week over week",
          why: "Load factor improves trivially by cutting showings — the guardrail closes the Goodhart trap the project itself pushes toward.",
        },
      },
      {
        name: "Revenue per screen-hour",
        kind: "primary",
        definition: "ticket revenue ÷ (screens × operating hours)",
        baseline: {
          value: null,
          howEstablished: "derivable from POS once showing grain is fixed",
          confidence: "estimable",
        },
        target: { value: "+3% chain-wide", basis: "a year-one figure the exec already uses" },
        guardrail: {
          metric: "concession revenue per admission",
          threshold: "must not drop more than 2%",
          why: "Shifting audiences to later showings changes the spend mix; ticket gains can be funded by concession losses.",
        },
      },
      {
        name: "Sellout / turnaway frequency",
        kind: "secondary",
        definition: "count of showings sold ≥95%",
        baseline: {
          value: null,
          howEstablished: "same POS history",
          confidence: "must_measure_first",
        },
        target: { value: "fewer turnaways on peak titles", basis: "not a target of zero" },
        guardrail: {
          metric: "sellout count",
          threshold: "a floor, not something to eliminate",
          why: "Some sellouts are correct pricing. Driving them to zero means leaving money on the table.",
        },
      },
      {
        name: "Distributor minimum showings",
        kind: "guardrail_only",
        definition: "showings per title per week versus contractual minimum",
        baseline: {
          value: "contractual, per title",
          howEstablished: "from the contract terms we asked for",
          confidence: "known",
        },
        target: { value: "no breach, ever", basis: "legal, not a metric to optimise" },
        guardrail: {
          metric: "minimum showings per title",
          threshold: "hard breach — never",
          why: "A legal problem, not a metric regression. Recommendations must be refused rather than flagged.",
        },
      },
    ],

    constraints: [
      {
        constraint: "Distributor minimum-showings and hold-over terms",
        kind: "contractual",
        hard: true,
        implication: "Constraint check must run before any recommendation is emitted.",
      },
      {
        constraint: "Physical turnaround between showings — cleaning, ingress, egress",
        kind: "physical",
        hard: true,
        implication: "Bounds how many showings fit in a day per screen.",
      },
      {
        constraint: "One screen can run one title at a time; fixed screens per site",
        kind: "physical",
        hard: true,
        implication: "Makes this an allocation problem, not a free schedule.",
      },
      {
        constraint: "One week to ship",
        kind: "budget",
        hard: true,
        implication: "Rules out a connector build and any UI.",
      },
    ],

    assumptions: [
      {
        assumption: "The grid is set weekly, per site, by a person",
        howToValidate: "Interview two programmers; watch one build a grid",
        ifWrong:
          "If it is centralised and quarterly, both the delivery mechanism and the cadence change.",
      },
      {
        assumption: "POS captures seating capacity per screen reliably",
        howToValidate: "Reconcile against the seating-plan system",
        ifWrong: "The denominator is wrong and every number in this brief is meaningless.",
      },
      {
        assumption: "Refunds and exchanges are a small fraction of sales",
        howToValidate: "Refund rate by daypart from POS",
        ifWrong:
          "Late refunds inflate load factor on exactly the days we are optimising for.",
      },
    ],

    grainStatement: "one row per showing — theatre × screen × scheduled start time",

    entities: [
      {
        name: "Showing",
        grain: "one row per showing",
        role: "fact",
        fields: [
          { name: "showing_id", type: "string", nullable: false, note: null },
          { name: "scheduled_start", type: "timestamp", nullable: false, note: null },
          { name: "actual_start", type: "timestamp", nullable: true, note: "null if cancelled" },
          { name: "cancelled", type: "boolean", nullable: false, note: null },
        ],
        sourceSystem: "POS",
        owner: "Ticketing team",
        refresh: "nightly batch",
        joinKeys: ["screen_id", "title_id"],
        expectedProblems: ["cancelled showings still carry sales rows"],
        schemaChangeRisk:
          "POS adds new format codes without notice; unknown codes must fail loudly rather than bucket to 'other'.",
        oftenForgotten: false,
      },
      {
        name: "TicketSale",
        grain: "one row per ticket",
        role: "fact",
        fields: [
          { name: "sale_id", type: "string", nullable: false, note: null },
          { name: "price_class", type: "string", nullable: false, note: "concession, matinee, premium" },
          { name: "amount", type: "decimal", nullable: false, note: null },
        ],
        sourceSystem: "POS",
        owner: "Ticketing team",
        refresh: "nightly batch",
        joinKeys: ["showing_id"],
        expectedProblems: ["utilisation without price class is misleading"],
        schemaChangeRisk:
          "New price classes appear each promo cycle — the unknown enum must fail loudly, not silently understate revenue for a quarter.",
        oftenForgotten: false,
      },
      {
        name: "Refund",
        grain: "one row per refund or exchange",
        role: "fact",
        fields: [
          { name: "refund_id", type: "string", nullable: false, note: null },
          { name: "refunded_at", type: "timestamp", nullable: false, note: "often after the showing" },
        ],
        sourceSystem: "POS",
        owner: "Ticketing team",
        refresh: "nightly batch",
        joinKeys: ["sale_id"],
        expectedProblems: [
          "late-arriving: lands after the showing, inflating load factor on exactly the days being optimised",
        ],
        schemaChangeRisk: null,
        oftenForgotten: true,
      },
      {
        name: "Screen",
        grain: "one row per screen per validity period",
        role: "dimension",
        fields: [
          { name: "screen_id", type: "string", nullable: false, note: null },
          { name: "seating_capacity", type: "int", nullable: false, note: "the denominator" },
          { name: "valid_from", type: "date", nullable: false, note: "capacity changes on refurbishment" },
        ],
        sourceSystem: "Seating-plan system",
        owner: "Estates",
        refresh: "on change",
        joinKeys: ["theatre_id"],
        expectedProblems: ["capacity changes on refurbishment; without history all comparisons break"],
        schemaChangeRisk:
          "Recliner conversion turns a seat count into a range, which breaks a non-nullable int column.",
        oftenForgotten: false,
      },
      {
        name: "Calendar",
        grain: "one row per date per locality",
        role: "exogenous",
        fields: [
          { name: "date", type: "date", nullable: false, note: null },
          { name: "is_holiday", type: "boolean", nullable: false, note: null },
          { name: "local_event", type: "string", nullable: true, note: null },
          { name: "school_term", type: "boolean", nullable: false, note: null },
        ],
        sourceSystem: "external feed + manual",
        owner: "Ops",
        refresh: "weekly",
        joinKeys: ["theatre_id"],
        expectedProblems: [
          "the most-forgotten entity, and it dominates the highest-value days; without it a holiday spike is attributed to the showtime",
        ],
        schemaChangeRisk: null,
        oftenForgotten: true,
      },
      {
        name: "StaffRoster",
        grain: "one row per shift",
        role: "operational",
        fields: [
          { name: "shift_id", type: "string", nullable: false, note: null },
          { name: "starts_at", type: "timestamp", nullable: false, note: null },
        ],
        sourceSystem: "Workforce system",
        owner: "Site managers",
        refresh: "weekly",
        joinKeys: ["theatre_id"],
        expectedProblems: ["a recommendation nobody can staff is not a recommendation"],
        schemaChangeRisk: null,
        oftenForgotten: true,
      },
    ],
  },

  architecture: {
    requirements: [
      {
        id: "F1",
        statement:
          "Produce load factor by daypart per theatre from POS and capacity, weekly",
        kind: "functional",
      },
      {
        id: "F2",
        statement: "Given a proposed showtime change, return a predicted load factor",
        kind: "functional",
      },
      {
        id: "NF1",
        statement: "Delivered before the weekly grid deadline",
        kind: "non_functional",
      },
      {
        id: "NF2",
        statement: "Numbers reproducible after the fact, since refunds arrive late",
        kind: "non_functional",
      },
    ],
    scale: {
      qualitativePrior: "three theatres, eight screens each, eight weeks of history",
      rulesOut: ["streaming ingestion", "a warehouse", "anything distributed"],
      needsArithmetic: true,
      estimate:
        "3 × 8 × ~5 showings/day × 56 days ≈ 7,000 rows — it fits in a spreadsheet, which settles the architecture",
    },
    components: [
      {
        id: "ingest",
        name: "Nightly POS CSV drop → landing store",
        layer: "ingestion",
        role: "Immutable raw, partitioned by business date",
        satisfiesRequirement: "NF2",
        narration:
          "Immutable raw partitioned by business date, so late refunds get restated rather than overwritten.",
        track: "data_engineering",
      },
      {
        id: "capacity",
        name: "Capacity reference",
        layer: "conformed",
        role: "Authoritative seat count per screen, with validity periods",
        satisfiesRequirement: "F1",
        narration:
          "The denominator of every number here. Stale capacity makes the whole report wrong, so it is explicit and versioned.",
        track: "data_engineering",
      },
      {
        id: "aggregate",
        name: "Daypart aggregation job",
        layer: "curated",
        role: "Load factor and revenue per screen-hour by daypart",
        satisfiesRequirement: "F1",
        narration:
          "Weekly cadence matches the decision cadence. Nothing here needs to beat the grid deadline.",
        track: "data_engineering",
      },
      {
        id: "predict",
        name: "Prediction function",
        layer: "serving",
        role: "Runs the same aggregation over a hypothetical grid",
        satisfiesRequirement: "F2",
        narration:
          "Reusing the measurement path is exactly why F2 is nearly free once F1 exists.",
        track: "data_engineering",
      },
      {
        id: "api",
        name: "What-if endpoint",
        layer: "api",
        role: "POST a proposed grid, receive predicted load",
        satisfiesRequirement: "F2",
        narration:
          "One endpoint keeps the door open for a UI later without committing to one now.",
        track: "full_stack",
      },
      {
        id: "view",
        name: "Programmer's weekly view",
        layer: "application",
        role: "Where the scheduling decision actually gets made",
        satisfiesRequirement: "NF1",
        narration:
          "Lands Thursday for a Friday deadline. This is where the decision happens, so it is the component I would cut last.",
        track: "full_stack",
      },
    ],
    dataFlow: [
      "POS CSV → landing (immutable, by business date)",
      "landing + capacity reference → daypart aggregation",
      "aggregation → prediction function → what-if endpoint",
      "aggregation → weekly view for the programmer",
    ],
    governance: {
      dataQuality: [
        {
          check: "Capacity non-null and > 0 for every active screen",
          threshold: "100%",
          owner: "Data engineering",
          onFail: "Block the run — the denominator is non-negotiable",
        },
        {
          check: "Showings per screen per day within plausible bounds",
          threshold: "1–8",
          owner: "Data engineering",
          onFail: "Alert; publish with a flag",
        },
        {
          check: "Refund rate within historical band",
          threshold: "±2σ",
          owner: "Analyst",
          onFail: "Flag the affected partition",
        },
        {
          check: "Calendar coverage forward",
          threshold: "90 days",
          owner: "Ops",
          onFail: "Alert the data owner",
        },
      ],
      security: {
        accessModel:
          "Site managers see their own site; regional programmers see their region",
        sensitiveData:
          "None. Aggregate ticket counts only — no customer records are needed for this problem.",
        piiInScope: false,
      },
      scaling: {
        bindingConstraint:
          "Not volume — the weekly grid deadline. The job must finish by Thursday.",
        headroom:
          "Enormous. A year of chain-wide data is still small enough to process in minutes.",
      },
      monitoring: [
        { signal: "Feed freshness and row-count delta", alertsWhom: "Data engineering" },
        { signal: "Recommendation acceptance rate", alertsWhom: "Product owner" },
        {
          signal: "Realised vs. predicted load per accepted change",
          alertsWhom: "Everyone — this is the training signal for everything after the MVP",
        },
      ],
    },
  },

  product: {
    mvpCutLine: ["ingest", "capacity", "aggregate", "predict"],
    shipsInWindow:
      "Truth set for three theatres, weekday-matinee daypart report, and a manually-run what-if: the programmer emails a proposed change, we return a predicted load factor.",
    provesWhat:
      "That the predicted load is close enough that the programmer would act on it.",
    deliveryMechanism: "A spreadsheet and an email. No UI.",
    bottlenecks: [
      {
        kind: "coordination",
        assessment:
          "POS data sits with a team we already work with; two sessions needed with the programmer.",
        costOfWindow: "some",
        narration:
          "Access is a conversation, not a project. Two sessions with the programmer is the real ask.",
      },
      {
        kind: "integration",
        assessment:
          "No documented POS export API — either build a connector or negotiate a nightly CSV drop.",
        costOfWindow: "most",
        narration:
          "There's no documented POS export API, so it's a connector or a negotiated nightly CSV. That eats most of the week and it's what I'd de-risk on day one.",
      },
      {
        kind: "rollout",
        assessment: "A spreadsheet emailed to one person.",
        costOfWindow: "negligible",
        narration:
          "No deployment story in v1 at all — which is exactly why I'd keep it that way.",
      },
    ],
    deliberateTechDebt: [
      {
        shortcut: "Hardcode the three theatres' seat counts",
        whyAcceptable: "Three sites, and capacity rarely changes inside a week",
        payBackWhen: "A fourth site joins, or any site refurbishes",
      },
      {
        shortcut: "Nightly CSV drop instead of a built connector",
        whyAcceptable: "Removes the integration bottleneck that otherwise eats the week",
        payBackWhen: "This survives past the pilot",
      },
    ],
    deferred: [
      {
        componentId: "api",
        item: "What-if endpoint",
        blockedBy: "the manual email round-trip proving useful first",
        impact: "medium",
        landsInMvp: 3,
      },
      {
        componentId: "view",
        item: "Programmer's weekly view",
        blockedBy: "the endpoint existing, and acceptance rate justifying a UI",
        impact: "medium",
        landsInMvp: 3,
      },
      {
        componentId: null,
        item: "Distributor-minimum constraint checking",
        blockedBy: "obtaining the contract terms",
        impact: "high",
        landsInMvp: 2,
      },
    ],
    nextMvps: [
      {
        version: 2,
        adds: "Distributor-minimum constraint checking",
        unblockedBy: "obtaining contract terms",
        impact: "high",
      },
      {
        version: 3,
        adds: "What-if endpoint and the programmer's view",
        unblockedBy: "Distributor-minimum constraint checking",
        impact: "medium",
      },
      {
        version: 4,
        adds: "Grid optimiser",
        unblockedBy: "What-if endpoint and the programmer's view",
        impact: "high",
      },
    ],
    killCriterion:
      "If predicted load does not beat the programmer's own picks on held-out weeks after two cycles, the schedule is not the binding constraint — and that result is itself worth reporting.",
  },

  coverage: computeCoverage(
    [
      ...(TRACK_TOPICS.data_engineering as readonly TopicId[]),
      "application_architecture",
      "api_design",
      "frontend_backend_interaction",
    ],
    "data_engineering",
    "Schema-evolution depth: unknown price-class enums fail loudly, capacity is a dimension with history, refunds restate rather than update in place.",
  ),

  deepDive: {
    area: "The data model, specifically what happens when the POS feed changes shape",
    track: "data_engineering",
    chosenBecause: "most_complex",
    reasoning:
      "This is where the solution goes silently wrong rather than merely slow: every number depends on a denominator nobody has validated, and the feed changes shape without warning.",
    askPermissionLine:
      "The part most likely to make this wrong rather than just slow is the data model — specifically what happens when the POS feed changes shape. I'd like to go deep there. Does that work?",
    template: "schema_evolution",
    depth: [
      {
        topic: "Late-arriving refunds",
        detail:
          "Refunds land after the showing, so a naive load factor is inflated on exactly the days being optimised.",
        likelyProbe: "How do you handle refunds that land after the showing?",
        answer:
          "Restatement, not update-in-place. Report with a stated lag and a confidence note, so a number already shown to the exec never silently changes underneath them.",
      },
      {
        topic: "Unknown price classes",
        detail: "New price classes appear each promo cycle.",
        likelyProbe: "POS adds a new price class mid-quarter. What happens?",
        answer:
          "The unknown enum fails loudly rather than bucketing into 'other'. Silently absorbing it understates revenue per screen-hour and nobody finds out for a quarter.",
      },
      {
        topic: "Capacity history",
        detail: "Refurbishment changes seat count, which is the denominator.",
        likelyProbe: "They convert a screen to recliners and capacity drops 40%.",
        answer:
          "Capacity is a dimension with validity periods. Old weeks keep their old denominator; without that, every historical comparison breaks the day a site refurbishes.",
      },
      {
        topic: "Blocking versus alerting",
        detail: "Not every quality failure deserves the same response.",
        likelyProbe: "What if capacity is simply wrong?",
        answer:
          "It's the denominator, so it's a blocking check rather than an alert — the run does not publish.",
      },
    ],
  },

  presentBack: null,

  requirementChanges: [
    {
      change: "Roll it out to another region",
      componentsAffected: ["capacity"],
      componentsUnchanged: ["ingest", "aggregate", "predict", "api", "view"],
      response:
        "Swap hardcoded capacities for a sync from the seating-plan system. That's the tech debt coming due, on schedule.",
    },
    {
      change: "Must work if the site loses connectivity",
      componentsAffected: ["view"],
      componentsUnchanged: ["ingest", "capacity", "aggregate", "predict", "api"],
      response:
        "Cache the last published report locally. The requirement is about reaching the user, not producing the answer, so nothing upstream changes.",
    },
  ],

  rubricSelfCheck: [
    {
      dimension: "ambiguity_handling",
      evidence:
        "All three elements triaged, stakeholder gap named, four opening questions drafted.",
      unprompted: true,
      challengesEngaged: 1,
      challengesAbsorbedSilently: 0,
      exercised: true,
      stillOnYouInTheRoom: "Asking them out loud before designing anything.",
    },
    {
      dimension: "user_empathy",
      evidence:
        "Asked what the programmer does today and located where the time is actually lost.",
      unprompted: false,
      challengesEngaged: 2,
      challengesAbsorbedSilently: 0,
      exercised: true,
      stillOnYouInTheRoom:
        "Asking the workaround question before being prompted — the session records which.",
    },
    {
      dimension: "outcome_orientation",
      evidence: "Every component traces to a requirement tied to the Friday grid deadline.",
      unprompted: true,
      challengesEngaged: 1,
      challengesAbsorbedSilently: 0,
      exercised: true,
      stillOnYouInTheRoom:
        "Resisting the optimiser — it's the more impressive build and the wrong instinct.",
    },
    {
      dimension: "scrappy",
      evidence:
        "Cut line drawn at four of six components, three bottlenecks costed, two pieces of tech debt named with payback conditions.",
      unprompted: true,
      challengesEngaged: 1,
      challengesAbsorbedSilently: 1,
      exercised: true,
      stillOnYouInTheRoom:
        "Holding 'spreadsheet, no UI' when it feels unambitious in the room.",
    },
    {
      dimension: "technical_depth",
      evidence: "Schema-evolution depth with four probes pre-answered.",
      unprompted: true,
      challengesEngaged: 0,
      challengesAbsorbedSilently: 0,
      exercised: true,
      stillOnYouInTheRoom: "Going deeper than the board when pushed a second time.",
    },
    {
      dimension: "collaboration",
      evidence:
        "Capacity-reference ghost box offered at the architecture segment and accepted with a stated reason.",
      unprompted: false,
      challengesEngaged: 3,
      challengesAbsorbedSilently: 1,
      exercised: true,
      stillOnYouInTheRoom:
        "Rejecting a suggestion with a reason rather than accepting it silently — collaboration is not compliance.",
    },
  ],

  talkTrack: [
    {
      minuteRange: "0–2",
      segment: "decomposition",
      move: "Triage all three elements",
      phrasing:
        "Before I design — who sets the schedule today, what data do we have, and what's the window to ship?",
    },
    {
      minuteRange: "2–9",
      segment: "decomposition",
      move: "Excavate the workaround",
      phrasing:
        "Walk me through how next week's grid actually gets made. And when you move a showtime, how do you find out if it worked?",
    },
    {
      minuteRange: "9–14",
      segment: "decomposition",
      move: "Options, and ask for the unlisted",
      phrasing:
        "My instinct is a what-if checker rather than an optimiser. Are there contractual minimums we'd need to respect?",
    },
    {
      minuteRange: "14–18",
      segment: "decomposition",
      move: "Metrics, leading with the guardrail",
      phrasing:
        "The risk with load factor is that you improve it by cutting showings, so I'd pair it with total admissions as a guardrail.",
    },
    {
      minuteRange: "18–33",
      segment: "architecture",
      move: "Requirements, the number, then components",
      phrasing:
        "Two functional, two non-functional. And it's about 7,000 rows — that fits in a spreadsheet, which rules out most of the architecture I might otherwise reach for.",
    },
    {
      minuteRange: "33–43",
      segment: "product",
      move: "Draw the cut line",
      phrasing:
        "Build isn't the constraint — integration is. No documented POS API, so that eats most of the week. Everything past the prediction function waits.",
    },
    {
      minuteRange: "43–58",
      segment: "depth",
      move: "Deep dive, with permission",
      phrasing:
        "The data model is where this gets wrong rather than just slow. I'd like to go deep there — does that work?",
    },
    {
      minuteRange: "58–60",
      segment: "wrap",
      move: "Next MVPs and the kill criterion",
      phrasing:
        "If predicted load doesn't beat the programmer's own picks in two cycles, the schedule isn't the binding constraint — and that's worth reporting.",
    },
  ],
};
