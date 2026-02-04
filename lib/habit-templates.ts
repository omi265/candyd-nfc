export interface MicroHabitLevel {
    level: number;
    description: string;
    duration: string;
    trigger?: string;
}

export interface CoreHabit {
    id: string;
    title: string;
    description: string;
    color: string;
    icon: string;
    levels: MicroHabitLevel[];
}

export const CORE_HABITS: CoreHabit[] = [
    {
        id: "move",
        title: "Move",
        description: "Counteract sedentary lifestyle; boost energy.",
        color: "bg-orange-100 text-orange-800",
        icon: "🏃",
        levels: [
            { level: 1, description: "Stand up and stretch arms overhead", duration: "10 sec", trigger: "After sitting 1hr" },
            { level: 2, description: "5 squats or 10 step march in place", duration: "30 sec", trigger: "Morning/Mid-day" },
            { level: 3, description: "2-minute walk (hallway/outside)", duration: "2 min", trigger: "After meals" },
            { level: 4, description: "5-minute movement break", duration: "5 min", trigger: "Scheduled break" }
        ]
    },
    {
        id: "breathe",
        title: "Breathe",
        description: "Regulate nervous system; reduce stress.",
        color: "bg-sky-100 text-sky-800",
        icon: "💨",
        levels: [
            { level: 1, description: "Take 3 deep breaths", duration: "30 sec", trigger: "Anytime" },
            { level: 2, description: "Box breathing (4 cycles)", duration: "1 min", trigger: "Before tasks" },
            { level: 3, description: "2-minute guided breath awareness", duration: "2 min", trigger: "Morning/Sleep" },
            { level: 4, description: "5-minute breathwork session", duration: "5 min", trigger: "Dedicated time" }
        ]
    },
    {
        id: "hydrate",
        title: "Hydrate",
        description: "Foundational health and cognitive function.",
        color: "bg-blue-100 text-blue-800",
        icon: "💧",
        levels: [
            { level: 1, description: "Drink 3 sips of water", duration: "10 sec", trigger: "Upon waking" },
            { level: 2, description: "Finish half a glass of water", duration: "30 sec", trigger: "Morning/Noon/Eve" },
            { level: 3, description: "Drink one full glass of water", duration: "1 min", trigger: "4x daily" },
            { level: 4, description: "Track 8 glasses daily", duration: "Ongoing", trigger: "Throughout day" }
        ]
    },
    {
        id: "nourish",
        title: "Nourish",
        description: "Mindful eating and awareness.",
        color: "bg-green-100 text-green-800",
        icon: "🥗",
        levels: [
            { level: 1, description: "Pause and take one mindful bite", duration: "15 sec", trigger: "Start of meal" },
            { level: 2, description: "Notice 3 flavors/textures", duration: "30 sec", trigger: "During meal" },
            { level: 3, description: "Eat first 2 mins without screen", duration: "2 min", trigger: "Lunch/Dinner" },
            { level: 4, description: "Complete one meal fully present", duration: "20 min", trigger: "One meal daily" }
        ]
    },
    {
        id: "rest",
        title: "Rest",
        description: "Sleep hygiene and recovery.",
        color: "bg-indigo-100 text-indigo-800",
        icon: "🌙",
        levels: [
            { level: 1, description: "Set phone to Do Not Disturb", duration: "5 sec", trigger: "30m before bed" },
            { level: 2, description: "Dim lights or screens", duration: "10 sec", trigger: "Evening" },
            { level: 3, description: "2-minute wind-down (eyes closed)", duration: "2 min", trigger: "Pre-sleep" },
            { level: 4, description: "10-minute bedtime routine", duration: "10 min", trigger: "Bedtime" }
        ]
    },
    {
        id: "reflect",
        title: "Reflect",
        description: "Self-awareness and emotional processing.",
        color: "bg-violet-100 text-violet-800",
        icon: "🪞",
        levels: [
            { level: 1, description: "Name your current emotion", duration: "10 sec", trigger: "When prompted" },
            { level: 2, description: "Write one sentence about feelings", duration: "30 sec", trigger: "Morning/Eve" },
            { level: 3, description: "2-minute journal entry", duration: "2 min", trigger: "End of day" },
            { level: 4, description: "5-minute reflection (wins/challenges)", duration: "5 min", trigger: "Evening" }
        ]
    },
    {
        id: "connect",
        title: "Connect",
        description: "Relationship maintenance and belonging.",
        color: "bg-pink-100 text-pink-800",
        icon: "❤️",
        levels: [
            { level: 1, description: "Think of one person you appreciate", duration: "10 sec", trigger: "Morning" },
            { level: 2, description: "Send 'Thinking of you' msg", duration: "30 sec", trigger: "Anytime" },
            { level: 3, description: "2-minute voice note/text", duration: "2 min", trigger: "Weekly" },
            { level: 4, description: "5-minute call or video chat", duration: "5 min", trigger: "Weekly" }
        ]
    },
    {
        id: "learn",
        title: "Learn",
        description: "Growth mindset and curiosity.",
        color: "bg-yellow-100 text-yellow-800",
        icon: "📚",
        levels: [
            { level: 1, description: "Read one headline or fact", duration: "15 sec", trigger: "Morning" },
            { level: 2, description: "Read one paragraph", duration: "1 min", trigger: "Commute/Break" },
            { level: 3, description: "Watch/Listen 2 mins content", duration: "2 min", trigger: "Scheduled" },
            { level: 4, description: "10 mins focused learning", duration: "10 min", trigger: "Daily block" }
        ]
    },
    {
        id: "create",
        title: "Create",
        description: "Creative output and flow state.",
        color: "bg-fuchsia-100 text-fuchsia-800",
        icon: "🎨",
        levels: [
            { level: 1, description: "Doodle a shape or write a word", duration: "15 sec", trigger: "When stuck" },
            { level: 2, description: "Write one sentence/sketch idea", duration: "1 min", trigger: "Creative block" },
            { level: 3, description: "2 mins free-form creation", duration: "2 min", trigger: "Spontaneous" },
            { level: 4, description: "10-minute creative session", duration: "10 min", trigger: "Daily practice" }
        ]
    },
    {
        id: "gratitude",
        title: "Gratitude",
        description: "Positive reframing and well-being.",
        color: "bg-teal-100 text-teal-800",
        icon: "🙏",
        levels: [
            { level: 1, description: "Think of one thing you're grateful for", duration: "10 sec", trigger: "Morn/Eve" },
            { level: 2, description: "Say 'thank you' silently 3x", duration: "30 sec", trigger: "Morning" },
            { level: 3, description: "Write down 3 gratitudes", duration: "2 min", trigger: "Evening" },
            { level: 4, description: "Send gratitude message", duration: "5 min", trigger: "Weekly" }
        ]
    }
];

// Backwards compatibility alias if needed, or remove if refactoring everything
export const HABIT_FOCUS_AREAS = CORE_HABITS;