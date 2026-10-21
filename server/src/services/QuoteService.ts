export interface MonkeytypeQuote {
  text: string;
  source?: string;
  length?: number;
  id?: number;
}

export class QuoteService {
  private static cachedQuotes: MonkeytypeQuote[] = [];
  private static isFetching: boolean = false;
  private static readonly QUOTES_URL =
    "https://raw.githubusercontent.com/monkeytypegame/monkeytype/refs/heads/master/frontend/static/quotes/english.json";

  // Built-in fallback quotes in case of offline sandbox or network interruption
  private static readonly fallbackQuotes: MonkeytypeQuote[] = [
    { text: "You have the power to heal your life, and you need to know that.", source: "Meditations to Heal Your Life", id: 1 },
    { text: "They don't know that we know they know we know.", source: "Friends", id: 2 },
    { text: "Don't it make you sad to know that life is more than who you are?", source: "Goo Goo Dolls - Name", id: 3 },
    { text: "Leave something for someone but don't leave someone for something.", source: "Five on a Hike Together", id: 4 },
    { text: "The people with ideas have no power and the people with power have no ideas.", source: "5,001 Wisdom Quotations", id: 5 },
    { text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", source: "Ralph Waldo Emerson", id: 6 },
    { text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", source: "Ralph Waldo Emerson", id: 7 },
    { text: "In the end, it's not the years in your life that count. It's the life in your years.", source: "Abraham Lincoln", id: 8 },
    { text: "The future belongs to those who believe in the beauty of their dreams.", source: "Eleanor Roosevelt", id: 9 },
    { text: "Life is what happens when you're busy making other plans.", source: "John Lennon", id: 10 },
    { text: "The only way to do great work is to love what you do.", source: "Steve Jobs", id: 11 },
    { text: "If you look at what you have in life, you'll always have more.", source: "Oprah Winfrey", id: 12 },
    { text: "If you set your goals ridiculously high and it's a failure, you will fail above everyone else's success.", source: "James Cameron", id: 13 },
    { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", source: "Benjamin Franklin", id: 14 },
    { text: "It is during our darkest moments that we must focus to see the light.", source: "Aristotle", id: 15 },
    { text: "Whoever is happy will make others happy too.", source: "Anne Frank", id: 16 },
    { text: "Always remember that you are absolutely unique. Just like everyone else.", source: "Margaret Mead", id: 17 },
    { text: "The best and most beautiful things in the world cannot be seen or even touched - they must be felt with the heart.", source: "Helen Keller", id: 18 },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", source: "Winston Churchill", id: 19 },
    { text: "Never let the fear of striking out keep you from playing the game.", source: "Babe Ruth", id: 20 },
    { text: "Live in the sunshine, swim the sea, drink the wild air.", source: "Ralph Waldo Emerson", id: 21 },
    { text: "Go confidently in the direction of your dreams! Live the life you've imagined.", source: "Henry David Thoreau", id: 22 },
    { text: "It is not length of life, but depth of life.", source: "Ralph Waldo Emerson", id: 23 },
    { text: "May you live all the days of your life.", source: "Jonathan Swift", id: 24 },
    { text: "Simplicity is the ultimate sophistication.", source: "Leonardo da Vinci", id: 25 },
  ];

  /**
   * Fetch quotes from monkeytype repository if not yet cached.
   */
  public static async loadQuotes(): Promise<void> {
    if (this.cachedQuotes.length > 0 || this.isFetching) return;
    this.isFetching = true;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(this.QUOTES_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = (await res.json()) as any;
        if (Array.isArray(data?.quotes) && data.quotes.length > 0) {
          this.cachedQuotes = data.quotes;
          console.log(`[QuoteService] Loaded ${this.cachedQuotes.length} quotes from Monkeytype.`);
        }
      }
    } catch (err: any) {
      console.warn(`[QuoteService] Could not fetch quotes from GitHub: ${err.message}. Using fallback quotes.`);
    } finally {
      this.isFetching = false;
      if (this.cachedQuotes.length === 0) {
        this.cachedQuotes = [...this.fallbackQuotes];
      }
    }
  }

  /**
   * Pick 1 random quote (or count quotes) from the monkeytype quotes dataset for a typing quote.
   */
  public static async getCombinedQuote(count: number = 1): Promise<string> {
    if (this.cachedQuotes.length === 0) {
      await this.loadQuotes();
    }
    const pool = this.cachedQuotes.length > 0 ? this.cachedQuotes : this.fallbackQuotes;
    const selected: string[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let idx = Math.floor(Math.random() * pool.length);
      while (usedIndices.has(idx) && attempts < 25) {
        idx = Math.floor(Math.random() * pool.length);
        attempts++;
      }
      usedIndices.add(idx);
      const item = pool[idx];
      const text = typeof item === "string" ? item : item?.text;
      if (text && text.trim().length > 0) {
        selected.push(text.trim());
      }
    }

    if (selected.length === 0) {
      return "The quick brown fox jumps over the lazy dog.";
    }

    return selected.join(" ");
  }
}
