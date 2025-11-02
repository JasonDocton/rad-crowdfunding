<div align="center"><img src="https://res.cloudinary.com/df23ubjbb/image/upload/v1635199620/Github/RAD_Logo.png" width="32" /> </div>

<div align="center">
  <h1>RAD CROWDFUNDING</h1>
  <h3>A Privacy Focused Approach To Accepting Bitcoin, Stripe, and PayPal Donations</h3>
  <a href="https://tanstack.com/start/latest">
    <img width="32px" alt="tanstack" src="https://tanstack.com/images/logos/logo-color-100.png">
  </a>
  <a href="https://www.convex.dev">
    <img width="32px" alt="convex" src="https://cdn.sanity.io/images/o0o2tn5x/production/285d09c87a0afb46b81044a49932f14539eb4778-400x400.png">
  </a>
  <a href="https://tailwindcss.com/">
    <img width="32px" alt="typeScript" src="https://res.cloudinary.com/df23ubjbb/image/upload/v1635202894/Github/Tailwindcss.png"  />
    </a>
  <br />
  <br />
  <figure>
    <img src="https://i.ibb.co/Jwkp2VtK/rad.gif" alt="demo" />
  </figure>
</div>

## Features
- 👌&nbsp; **0 Fundraising Platform Fees**
-- Make the most of your donations by ditching fundraising platforms. Only payment processor fees apply.

- 🥇&nbsp; **First Party Bitcoin Payments**
-- Fully built and managed in this project. Provide your address, accept secure donations anywhere.

- 🧙‍♂️&nbsp; **Real-time Donation Tracking**
-- Donations appear instantly without refreshing the page. Always in sync with your database.

- 🥷&nbsp; **Aggressive Privacy By Default**
-- Collect donations, not contacts. 0 identifying information collected or shared between client and database.

- 🔒&nbsp; **Bank-level Payment Security**
-- SHA-256 hashed functions, XChaCha20-Poly1305 encryption. Detect tampering attempts, resist side-channel attacks, and protect against client-side theft.

- 🗂️&nbsp; **Fully Self Hostable**
-- Take full control of your project. Your database is open source and ready to host however you prefer.

- 📄&nbsp; **Documented For Humans&AI**
-- Every file, several guides- lots of comments. I've written as much text as I have code, then tasked an AI Agent to make sure everything makes sense to them.


## Intro
It's been a few years since I touched code, but I needed to create a quick and dirty fundraising platform for a friend that was diagnosed with cancer. The original project served its purpose while reigniting my passion for coding, and this project is the result. My goal here was to recreate the original project with all of the latest tools and tech that looked exciting, and also make it open source so others can use it as a starting point for their own projects. This project contains a lot of design, privacy, and security choices based on the video game Rust, where I originally met my friend through.

## Before You Launch

### Convex and your envs

**Convex has TWO completely separate deployments:** Both run in a node ==production environment==. Because this can create issues for NODE.ENV, we set CONVEX_ENV=development in our development dashboard and CONVEX_ENV=production in our production dashboard

| Aspect | Development Deployment | Production Deployment |
|--------|----------------------|---------------------|
| **Dashboard** | Separate dev dashboard | Separate prod dashboard |
| **Database** | Dev database (empty on creation) | Prod database (empty on creation) |
| **Environment Variables** | CONVEX_ENV=development - BITCOIN_NETWORK=testnet | CONVEX_ENV=production - BITCOIN_NETWORK=mainnet |
| **URL** | `https://***-****-****` | `https://***-****-****` |
| **Data** | Test donations, test Bitcoin sessions | Real donations, real Bitcoin sessions |

**How it works:**
1. You define table schemas in `convex/schema.ts`
2. When you deploy, Convex creates tables based on your schema
3. Both dev and prod get the same table structure, but different data
4. You set your dev keys in the dev dashboard or via the convex cli (script in .env.example)
5. You set your prod keys in the prod dashboard or via the convex cli (script in .env.example)

It's normal that your .env.local only has VITE_CONVEX_URL. Your production env settings, configured in Github or your host env settings, will also just contain VITE_CONVEX_URL. You can find this URL in your Convex Dashboard > Settings > URL & Deploy Key > click Show development credentials > Deployment URL.

### Webhooks & the HTTP Actions URL

We use the HTTP Actions URL for our webhook endpoints. *Your endpoint will not be https://yoursite.com/stripe/webhook*.

**How it works:**
1. Navigate to your Convex Dashboard > Settings > URL & Deploy Key > click Show development credentials > HTTP Actions URL.
2. In your Stripe Webhooks Dashboard, set the Endpoint URL to YOUR-HTTP-ACTIONS-URL-HERE/stripe/webhook
3. In your PayPal Webhooks Dashboard, set the Endpoint URL to YOUR-HTTP-ACTIONS-URL-HERE/paypal/webhook
4. Don't forget that your development and production convex urls are different!

### ⚠️ CRITICAL: Bitcoin Network Configuration

**THE MOST IMPORTANT THING TO UNDERSTAND:**

Bitcoin has two networks:
- **Testnet** - Fake bitcoin for testing (worthless, safe to experiment)
- **Mainnet** - Real bitcoin (real money, **IRREVERSIBLE TRANSACTIONS**)

**If you configure the wrong network, you will LOSE FUNDS:**
- Setting testnet in production → Donations go to testnet addresses (lost forever)
- Setting mainnet in development → You might accidentally spend real bitcoin

**You must configure:**
1. **Development** → `BITCOIN_NETWORK=testnet` + `BITCOIN_MASTER_VPRV` (testnet key)
2. **Production** → `BITCOIN_NETWORK=mainnet` + `BITCOIN_MASTER_ZPRV` (mainnet key)

### ⚠️ CRITICAL: Bitcoin Key Generation
Generate your mainnet Bitcoin key using a **hardware wallet** or **air-gapped machine**.

**Option 1: Hardware Wallet (Recommended)**

1. Use Ledger or Trezor
2. Export BIP84 extended private key (zprv)
3. Store backup in secure offline location (safe deposit box)

**Option 2: Electrum (Air-gapped)**

```bash
# Download Electrum from electrum.org
# 1. Install on air-gapped computer (never connected to internet)
# 2. Follow detailed guide BITCOIN_SETUP.md
# 5. Transfer zprv to Convex Dashboard via QR code or USB (one-time)
# 6. Delete zprv from air-gapped machine after transfer
```

**Never:**
- Generate mainnet keys on internet-connected machines
- Email or Slack Bitcoin private keys
- Store keys in cloud storage or password managers
- Reuse keys across multiple projects
- If you're not able to use an air-gapped machine, create and use a new production Bitcoin address frequently!

### If you use this as a template:
1. Make sure to use your own privacy and terms of service pages - current ones are specific to RAD
2. Update the sitemap.xml and robots.txt to match your info


## Configuration

### Environment Variables

Create a `.env.local` file in the root directory with your Convex URL:

```bash
# Convex URL
VITE_CONVEX_URL=***-***-****
```

Setup the following envs in your Convex Dashboard:

**Reminder, you'll need to do this for both the development and production dashboards**

| Variable | Example | Where to Find |
|----------|---------|---------------|
| `BITCOIN_NETWORK` | `testnet` or `mainnet` |  |
| `BITCOIN_MASTER_(V/Z)PRV` | `vprv` or `zprv` | Generated from your Bitcoin wallet |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard → Live mode → API Keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard → Webhooks → Signing secret |
| `PAYPAL_CLIENT_ID` | Long string | PayPal Developer → My Apps → Live → Client ID |
| `PAYPAL_CLIENT_SECRET` | Long string | PayPal Developer → My Apps → Live → Secret |
| `PAYPAL_WEBHOOK_ID` | `WH-...` | PayPal Developer → Webhooks → Webhook ID |
| `SITE_URL` | `http://localhost:3000` | Your production domain |

### Configuration Files

- **`donate-config.ts`** - Change recommended donation amounts and decorative icons
- **`env-config.ts`** - Add additional envs for validation and auto-complete usage
- **`site-config.ts`** - Modify SEO and social media for your site


## Acknowledgements
Huge thanks to:

- [Theo Browne](https://github.com/t3dotgg) for introducing me to the coding world and giving me a such a strong foundation of knowledge to build from.

- [Jacob Evans](https://github.com/JacobMGEvans) for teaching me everything there is to know about backend and inspiring my switch to Cloudflare Workers.

- [Tanner Linsley](https://github.com/tannerlinsley) for his relentless dedication to TanStack and improving the React ecosystem.

## Yapping About Code

I went into this project really excited to try out the latest tools, like TanStack Start and Convex. Although I wasn't familiar with any of the tools in this stack (apart from my beloved Tailwind), I've always admired Tanner's work and knew immediately that I had to use TanStack Start when it hit RC. In the spirit of learning new things, I decided to use ZED as my IDE, Biome as my linter/formatter, and Convex as my backend/database solution. This also felt like a great opportunity to explore coding alongside AI, which now feels like a fundemental part of my workflow. As all good refactoring projects go, it took me a lot longer than expected to finish, but I absolutely loved the entire process and feel like I've learned a great deal along the way.

**TanStack Start** - I fully expected to love TanStack Start, and it did not disappoint. The experience felt like a natural evolution of the TanStack Router, with all of the tools and features I love without any of the bloat that comes with larger meta-frameworks. Even though it's still in RC, I don't recall running into any issues or major limitations. Everything just worked straight out of the box, with the only real tough decision coming down to leaning more into TanStack or Convex for handling certain aspects of the project. This was a great problem to have, and I ended trying to find ways to leverage both tools just for the fun of it.

Testing the new Next.js 16 features sounds tempting, but I think I'll stick with TanStack Start for future projects. The only drawback I could come up with during the entire time I was working on this project was the currently PR'd nonce support. I really can't wait to redo more projects with Tanstack Start in the near future.

**Biome** - A bit out of place writing about this second, but I wanted to cover a tool I absolutely expected to hate. I imagine it's a byproduct of being on the autism spectrum, but code needs to look a certain way and follow certain rules for me to feel comfortable working with it. All of my previous projects reflect a great deal of time and effort put into various Eslint rules, Prettier configurations, and custom scripts to make sure everything looks and feels just right. Still, I was curious about Biome and thought I'd give it a shot. I'm sure being new to ZED as my IDE only compounded on the issues, but I had a miserable time getting Biome to work properly. The migrate tool created a mess of conflicting rules, the LSP Proxy failed often, and I spent the first few days of the project just trying to get Biome to behave. I found these issues carried over to VSCode, which really confused me. After a lot of trial and error, ultimately downgrading Zed to an earlier version and upgrading the Biome extension to what was the pre-release version at the time, everything suddenly worked.

The initial headache aside, I'm now 100% locked into Biome and love it. 9,298 lines of code may not be a lot, but seeing Biome go through it instantly is still mindblowing to me. More important than that though is the default settings for Biome are incredibly well thought out and don't require much, if any, tweaking. My current biome.json may look a bit detailed, but nearly everything there is just me wanting Biome to throw errors instead of warnings for certain things. I'm not sure why I struggled so much at the start, and I still get a bit nervous thinking about messing with my ZED specific Biome settings, but it was worth it in the end.

**Convex** - When I first started coding, I was extremely fortunate to discover Supabase just as it was releasing. I've used Supabase for all of my projects, and even though the Planetscale wave nearly swept me away, I ultimately came back to Supabase. But continuing on the them of this project stack, I ended up becoming a Convex devote. There were a few quirks and gotcha moments, but embracing Convex changed the entire flow of the project for the best. No ORMs, no SQL, not even TRPC- an otherwise staple of every project I work on. Despite my excitement to use TanStack Start for as much as possible, I found myself thoroughly enjoying doing everything I could in Convex. There are some files in this project that could easily be done with Convex, but I went out of my way to do use other approaches or tools just to compare the experience.

Convex is likely to replace Supabase for me going forward, but there was one major drawback that I couldn't ignore despite the otherwise incredible DX. Of the 10 or so days I've worked on this project, Convex had outtage issues on 5 of those days. Noting the AWS outtage that happened during this time, it was a bit frustrating to have no access to the Convex Dashboard at times, or be unable to deploy functions. At it's worst, I had to end a day of development early because both the dashboard and function deployments were down for hours. Still, from what I had researched, this seemed to be an abnormal amount of downtime for Convex that I don't imagine experiencing going forward.

**Zed** - It has slowly dawned on me that many of my coding friends are either using Cursor or work at Cursor, but I some how missed Cursor entirely when I made the decision to go with Zed. Had I realized just how many people around me were using Cursor, I absolutely would have used it; however, I'm quite glad things played out the way they did. While my appreciation for the Agent panels and all things AI has rapidly increased over the last few days I've been at this, I'm still learning how to really utilize AI and adopt an Agentistic approach. I don't really have a good frame of reference for how Zed compares to Cursor, VSCode, or other IDEs in that regard. What was immediately clear though was just how much passion went into creating Zed. It's a love-letter to coding, with an immaculate interface that displays everything you need to see while maintaining what I can only describe as a pure view of code. I look at my VSCode, which I've spent so much effort finding the perfect theme, icons, and extensions for, and though I can see a major difference with even just a glance, it's a lot harder to describe all of the subtle nuances and attention to detail that make Zed so much cleaner straight out of the box.

I know I've got to try Cursor, especially after the multi-agent interface release, but it'll be tough taking a break from the speed and visual clarity of Zed. I have no doubt I'll be back on Zed after giving Cursor a try.

**Tailwind** - Trust me, you don't want me to write about Tailwind. I'm a Tailwind zealot. It was perfect in this project, just as it was for the previous project, just as it always is.

**Tools I Missed Using** - TRPC, T3.env. Although I can see the use case for TRPC with Convex, I think it would have been a bit redundant at this scale. Convex provides your schema, generates the API, handles the hooks, and does so entirely with Typescript. For the most part, it does, by default, what you'd seek to create with TRPC. That doesn't mean there isn't room for adding additional layers of safety or validation through TRPC and Zod, but agaiin, a bit redundant. Decided to create my own proxy based unified env instead of using T3.env was.. a choice. I had fun with it, but wouldn't recommend using it over T3.env for your project.


## Support

- **Issues**: [GitHub Issues](https://github.com/username/rad-crowdfunding/issues)
- **Discussions**: [GitHub Discussions](https://github.com/username/rad-crowdfunding/discussions)
- **Discord**: jasondocton

- **[Consider Sponsoring YouAreRAD](https://github.com/sponsors/youarerad)**: Just $30 helps our non-profit cover the cost of mental health care for someone in need.

<div align="center"><img src="https://res.cloudinary.com/df23ubjbb/image/upload/v1635199620/Github/RAD_Logo.png" width="32" /> </div>

[⬆ Back to Top](#rad-crowdfunding)
