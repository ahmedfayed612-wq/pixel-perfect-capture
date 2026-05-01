// All Waqti UI strings. Bilingual (AR default, EN secondary).
// Voice rules: short sentences, action verbs, no jargon. Strings from spec verbatim.

export type Lang = "ar" | "en";

export const t = {
  brand: { en: "WAQTI", ar: "وقتي" },
  tagline: { en: "YOUR TIME. YOUR GOALS. YOUR SUCCESS.", ar: "وقتك. أهدافك. نجاحك." },

  // Nav
  nav: {
    login: { en: "Log In", ar: "تسجيل الدخول" },
    startFree: { en: "Start Free", ar: "ابدأ مجاناً" },
    signup: { en: "Sign Up", ar: "إنشاء حساب" },
    home: { en: "Home", ar: "الرئيسية" },
    pricing: { en: "Pricing", ar: "الأسعار" },
    privacy: { en: "Privacy Policy", ar: "سياسة الخصوصية" },
    terms: { en: "Terms", ar: "الشروط" },
    dashboard: { en: "Dashboard", ar: "الرئيسية" },
    timer: { en: "Timer", ar: "المؤقت" },
    subjects: { en: "Subjects", ar: "المواد" },
    schedule: { en: "Schedule", ar: "الجدول" },
    analytics: { en: "Analytics", ar: "التحليلات" },
    streaks: { en: "Streaks", ar: "السلاسل" },
    invite: { en: "Invite Friends", ar: "ادعو أصحابك" },
    settings: { en: "Settings", ar: "الإعدادات" },
    logout: { en: "Log Out", ar: "تسجيل الخروج" },
  },

  // Landing
  hero: {
    h1: { en: "Your time. Your goals. Your success.", ar: "وقتك. أهدافك. نجاحك." },
    sub: {
      en: "Egypt's first study tracker built for Egyptian students. Arabic. Affordable. Yours.",
      ar: "أول تطبيق متابعة مذاكرة اتبنى للطالب المصري. بالعربي. بسعر مناسب. وقتك.",
    },
    primary: { en: "Start for Free", ar: "ابدأ مجاناً" },
    secondary: { en: "See Plans", ar: "شوف الباقات" },
  },
  problem: {
    label: { en: "SOUND FAMILIAR?", ar: "حاجات بتحصل معاك؟" },
    h2: {
      en: "Egyptian students study hard. Without tracking, it doesn't add up.",
      ar: "الطلاب المصريين بيذاكروا كتير. بس بدون متابعة، مش بيعرفوا وين بيروح وقتهم.",
    },
    cards: [
      {
        title: { en: "No visibility", ar: "مفيش وضوح" },
        body: {
          en: "You study for hours but can't answer: how many hours did I study this week?",
          ar: "بتذاكر ساعات وما تعرفش جاوبت ع السؤال ده: ذاكرت كام ساعة الأسبوع ده؟",
        },
      },
      {
        title: { en: "Wrong tools", ar: "أدوات غلط" },
        body: {
          en: "Global apps don't speak Egyptian. They're not built for Thanaweya Amma or university semesters.",
          ar: "التطبيقات العالمية مش بتفهم الطالب المصري. مش متعملة للثانوية العامة ولا الجامعة.",
        },
      },
      {
        title: { en: "Can't pay", ar: "الدفع صعب" },
        body: {
          en: "Most Egyptian students can't pay USD subscriptions. Waqti accepts Fawry, Vodafone Cash, and cards.",
          ar: "أغلب الطلاب المصريين مش قادرين يدفعوا بالدولار. وقتي بيقبل فوري وفودافون كاش والكروت.",
        },
      },
    ],
  },
  features: {
    label: { en: "WHAT WAQTI DOES", ar: "إيه اللي بيعمله وقتي" },
    h2: { en: "Four tools. One habit.", ar: "أربع أدوات. عادة واحدة." },
    cards: [
      {
        icon: "Timer",
        title: { en: "Study Timer", ar: "مؤقت المذاكرة" },
        body: {
          en: "Start, pause, stop. Every session recorded by subject.",
          ar: "ابدأ، وقّف، خلّص. كل جلسة بتتسجل حسب المادة.",
        },
        pro: false,
      },
      {
        icon: "Calendar",
        title: { en: "Schedule Planner", ar: "مخطط الجدول" },
        body: {
          en: "Plan your week. Saturday to Friday. Color-coded by subject.",
          ar: "خطط أسبوعك. من السبت للجمعة. كل مادة بلونها.",
        },
        pro: true,
      },
      {
        icon: "BarChart3",
        title: { en: "Analytics", ar: "التحليلات" },
        body: {
          en: "See exactly where your time goes. Per subject. Per day.",
          ar: "شوف بالظبط وقتك بيروح فين. لكل مادة. لكل يوم.",
        },
        pro: true,
      },
      {
        icon: "Flame",
        title: { en: "Streaks", ar: "السلاسل" },
        body: {
          en: "Don't break the chain. Study every day. Watch your streak grow.",
          ar: "ما تكسرش السلسلة. ذاكر كل يوم. وشوف السلسلة بتكبر.",
        },
        pro: false,
      },
    ],
  },
  pricing: {
    label: { en: "SIMPLE PRICING", ar: "أسعار بسيطة" },
    h2: { en: "One price. No tricks.", ar: "سعر واحد. مفيش خدع." },
    launch: {
      en: "🎉 First month: 30 EGP — and 15 EGP of it is donated to Resala Charity.",
      ar: "🎉 أول شهر: 30 جنيه — وبنتبرع بـ 15 جنيه منهم لجمعية رسالة.",
    },
    free: {
      title: { en: "Free", ar: "مجاني" },
      price: { en: "0 EGP / month", ar: "0 جنيه / شهر" },
      features: [
        { en: "Study timer", ar: "مؤقت المذاكرة", on: true },
        { en: "Up to 3 subjects", ar: "حتى 3 مواد", on: true },
        { en: "7-day history", ar: "سجل آخر 7 أيام", on: true },
        { en: "Basic streak tracker", ar: "متابعة سلسلة بسيطة", on: true },
        { en: "Schedule planner", ar: "مخطط الجدول", on: false },
        { en: "Analytics", ar: "التحليلات", on: false },
        { en: "Full history", ar: "السجل الكامل", on: false },
      ],
      cta: { en: "Start Free", ar: "ابدأ مجاناً" },
    },
    pro: {
      badge: { en: "MOST POPULAR", ar: "الأكثر اختياراً" },
      title: { en: "Pro", ar: "برو" },
      price: { en: "30 EGP / month", ar: "30 جنيه / شهر" },
      sub: { en: "First month 30 EGP — 15 EGP donated to Resala", ar: "أول شهر 30 جنيه — بنتبرع بـ 15 منهم لرسالة" },
      features: [
        { en: "Everything in Free", ar: "كل اللي في المجاني" },
        { en: "Unlimited subjects", ar: "مواد بلا حدود" },
        { en: "Full study history", ar: "السجل كامل" },
        { en: "Schedule planner", ar: "مخطط الجدول" },
        { en: "Analytics dashboard", ar: "لوحة التحليلات" },
        { en: "Full streaks + heatmap", ar: "السلاسل والخريطة الحرارية" },
        { en: "Priority support", ar: "دعم متميز" },
      ],
      cta: { en: "Upgrade to Pro", ar: "اشترك في برو" },
    },
  },
  charity: {
    body: { en: "Donated to Resala Charity so far", ar: "اتبرعنا بيها لجمعية رسالة لحد دلوقتي" },
    sub: { en: "15 EGP from every student's first month subscription", ar: "15 جنيه من أول اشتراك لكل طالب" },
  },
  trust: {
    h2: { en: "Built for Egyptian students", ar: "اتبنى للطالب المصري" },
    body: {
      en: "Not adapted from a global tool. Not translated. Built from scratch — in Arabic, at a price every Egyptian student can afford, with payment methods they actually use.",
      ar: "مش متعدّل من تطبيق عالمي. مش ترجمة. اتبنى من الصفر — بالعربي، بسعر يقدر عليه أي طالب مصري، وبطرق دفع بيستخدمها فعلاً.",
    },
    badges: [
      { en: "Made in Egypt", ar: "صُنع في مصر" },
      { en: "Fawry & Vodafone Cash accepted", ar: "بنقبل فوري وفودافون كاش" },
      { en: "15 EGP of first month goes to charity", ar: "15 جنيه من أول شهر بيروحوا للجمعية" },
    ],
  },
  footer: { copy: { en: "© 2025 Waqti. All rights reserved.", ar: "© 2025 وقتي. جميع الحقوق محفوظة." } },

  // Auth
  auth: {
    signupTitle: { en: "Create your account", ar: "إنشاء حسابك" },
    loginTitle: { en: "Welcome back", ar: "أهلاً بعودتك" },
    forgotTitle: { en: "Reset your password", ar: "إعادة تعيين كلمة السر" },
    resetTitle: { en: "Set a new password", ar: "اختار كلمة سر جديدة" },
    name: { en: "Full name", ar: "الاسم بالكامل" },
    email: { en: "Email", ar: "الإيميل" },
    password: { en: "Password", ar: "كلمة السر" },
    studentType: { en: "I am a", ar: "أنا" },
    highschool: { en: "High School", ar: "ثانوي" },
    university: { en: "University", ar: "جامعي" },
    submitSignup: { en: "Create account", ar: "إنشاء الحساب" },
    submitLogin: { en: "Log in", ar: "تسجيل الدخول" },
    submitForgot: { en: "Send reset link", ar: "ابعت الرابط" },
    submitReset: { en: "Update password", ar: "حدّث كلمة السر" },
    forgotLink: { en: "Forgot password?", ar: "نسيت كلمة السر؟" },
    haveAccount: { en: "Already have an account?", ar: "عندك حساب؟" },
    noAccount: { en: "New to Waqti?", ar: "جديد على وقتي؟" },
    confirmEmail: {
      en: "Check your email to confirm your account before logging in.",
      ar: "افتح إيميلك واضغط على الرابط لتفعيل الحساب قبل تسجيل الدخول.",
    },
    resetSent: { en: "If that email exists, a link is on the way.", ar: "لو الإيميل ده موجود، الرابط في الطريق." },
    genericError: { en: "Something went wrong. Try again.", ar: "حصل خطأ. جرّب تاني." },
  },

  // Onboarding
  onboarding: {
    step1Title: { en: "What do you study?", ar: "بتذاكر إيه؟" },
    step1Sub: { en: "Add your first subject. You can change this later.", ar: "أضف أول مادة. تقدر تعدلها بعدين." },
    subjectName: { en: "Subject name", ar: "اسم المادة" },
    chooseColor: { en: "Pick a color", ar: "اختار لون" },
    step2Title: { en: "Set a daily goal", ar: "حدد هدف يومي" },
    step2Sub: { en: "How many hours per day?", ar: "بتذاكر كام ساعة في اليوم؟" },
    step3Title: { en: "Start your first session", ar: "ابدأ أول جلسة" },
    step3Sub: { en: "The clock is ready. So are you.", ar: "الساعة جاهزة. وأنت كمان." },
    startTimer: { en: "Start Timer", ar: "ابدأ المؤقت" },
    skip: { en: "Skip", ar: "تخطي" },
    next: { en: "Next", ar: "التالي" },
  },

  // Dashboard
  dashboard: {
    morning: { en: "Good morning", ar: "صباح الخير يا" },
    evening: { en: "Good evening", ar: "مساء الخير يا" },
    today: { en: "Today", ar: "النهارده" },
    hours: { en: "hours", ar: "ساعات" },
    noSessions: { en: "No sessions yet. Start now!", ar: "مفيش جلسات لسه. ابدأ دلوقتي!" },
    yourSubjects: { en: "YOUR SUBJECTS", ar: "مواديك" },
    addFirstSubject: { en: "Add your first subject", ar: "أضف أول مادة" },
    todaySchedule: { en: "TODAY'S SCHEDULE", ar: "جدول النهارده" },
    noScheduleFree: { en: "Plan your week with Pro", ar: "خطط أسبوعك مع برو" },
    noSchedule: { en: "No sessions planned. Add to your schedule →", ar: "مفيش جلسات متخطط لها. أضف للجدول ←" },
    daysStreak: { en: "day streak", ar: "يوم متتالي" },
    quickAnalytics: { en: "View Analytics", ar: "شوف التحليلات" },
    quickStreaks: { en: "Full Streaks", ar: "السلاسل" },
    quickInvite: { en: "Invite Friends", ar: "ادعو أصحابك" },
    start: { en: "Start", ar: "ابدأ" },
    weekGoal: { en: "hrs/week", ar: "ساعة/أسبوع" },
  },

  // Timer
  timer: {
    selectSubject: { en: "Select a subject", ar: "اختار مادة" },
    startSession: { en: "Start Session", ar: "ابدأ الجلسة" },
    pause: { en: "Pause", ar: "وقّف" },
    resume: { en: "Resume", ar: "كمّل" },
    end: { en: "End Session", ar: "خلّص الجلسة" },
    sessionComplete: { en: "Session Complete!", ar: "الجلسة خلصت!" },
    addNote: { en: "Add a note (optional)", ar: "أضف ملاحظة (اختياري)" },
    save: { en: "Save Session", ar: "احفظ الجلسة" },
    discard: { en: "Discard", ar: "مش مهتم" },
    addSubjectFirst: { en: "Add a subject first to track your session", ar: "أضف مادة الأول علشان تسجل جلستك" },
  },

  // Subjects
  subjects: {
    title: { en: "Your Subjects", ar: "مواديك" },
    add: { en: "+ Add Subject", ar: "+ أضف مادة" },
    new: { en: "New Subject", ar: "مادة جديدة" },
    edit: { en: "Edit Subject", ar: "عدّل المادة" },
    nameAr: { en: "Arabic name (optional)", ar: "الاسم بالعربي (اختياري)" },
    weekly: { en: "Weekly goal (hours)", ar: "هدف الأسبوع (ساعات)" },
    save: { en: "Save", ar: "احفظ" },
    delete: { en: "Delete subject", ar: "احذف المادة" },
    thisWeek: { en: "This week", ar: "الأسبوع ده" },
    capTitle: { en: "You've reached the 3-subject limit on the Free plan.", ar: "وصلت لحد 3 مواد في الباقة المجانية." },
    upgradePrompt: { en: "This is a Pro feature. Upgrade for just 30 EGP/month.", ar: "الميزة دي للمشتركين. اشترك بـ 30 جنيه بس في الشهر." },
    upgradeNow: { en: "Upgrade Now", ar: "اشترك دلوقتي" },
    later: { en: "Maybe later", ar: "بعدين" },
  },

  // Streaks
  streaks: {
    title: { en: "Streaks", ar: "السلاسل" },
    daysStreak: { en: "day streak", ar: "يوم متتالي" },
    longest: { en: "Longest streak", ar: "أطول سلسلة" },
    days: { en: "days", ar: "أيام" },
    msg0: { en: "Start today!", ar: "ابدأ النهارده!" },
    msg1to6: { en: "Keep it up!", ar: "كمّل كده!" },
    msg7plus: { en: "You're on fire!", ar: "أنت نار!" },
    current: { en: "Current Streak", ar: "السلسلة الحالية" },
    longestCard: { en: "Longest Streak", ar: "أطول سلسلة" },
    totalDays: { en: "Total Study Days", ar: "أيام المذاكرة" },
    last3: { en: "Last 3 Months", ar: "آخر 3 شهور" },
  },

  // Pro lock
  pro: {
    upgrade: { en: "Upgrade to Pro", ar: "اشترك في برو" },
    schedulePrompt: { en: "Plan your week, protect your streaks.", ar: "خطط أسبوعك، احمي سلسلتك." },
    analyticsPrompt: { en: "See exactly where your time goes.", ar: "شوف بالظبط وقتك بيروح فين." },
    heatmapPrompt: { en: "Unlock your full study heatmap.", ar: "افتح خريطة المذاكرة الكاملة." },
  },

  common: {
    loading: { en: "Loading…", ar: "جاري التحميل…" },
    cancel: { en: "Cancel", ar: "إلغاء" },
    confirm: { en: "Confirm", ar: "تأكيد" },
  },
};

export type StringPair = { en: string; ar: string };
export const tr = (pair: StringPair, lang: Lang) => pair[lang];
