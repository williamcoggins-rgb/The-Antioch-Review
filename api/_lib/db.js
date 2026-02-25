/**
 * Database module for Vercel Postgres
 * Shared by all serverless functions
 */
const { sql } = require('@vercel/postgres');
const crypto = require('crypto');

let initialized = false;

async function initTables() {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      source TEXT DEFAULT 'newsletter',
      subscribed_at TIMESTAMPTZ DEFAULT NOW(),
      active BOOLEAN DEFAULT TRUE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      author TEXT NOT NULL,
      section TEXT NOT NULL,
      label TEXT DEFAULT '',
      body TEXT NOT NULL,
      excerpt TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      featured BOOLEAN DEFAULT FALSE,
      published BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      plan TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'USD',
      square_payment_id TEXT,
      status TEXT DEFAULT 'completed',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Create default admin if none exists
  const { rows } = await sql`SELECT COUNT(*) as cnt FROM admin_users`;
  if (parseInt(rows[0].cnt) === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('Sanfred4926', salt, 64).toString('hex');
    await sql`INSERT INTO admin_users (username, password_hash, salt) VALUES ('admin', ${hash}, ${salt})`;
  }

  // Seed starter articles if table is empty
  const articleCount = await sql`SELECT COUNT(*) as cnt FROM articles`;
  if (parseInt(articleCount.rows[0].cnt) === 0) {
    await seedStarterArticles();
  }

  initialized = true;
}

// --- Seed starter articles (runs once when DB is empty) ---
async function seedStarterArticles() {
  const articles = [
    // FAITH (3 articles, first one is featured)
    { title: 'Revival Breaks Out at University of Kentucky as Students Pack Chapel Services', subtitle: 'Thousands gather for continuous worship now entering second week', author: 'Sarah Mitchell', section: 'faith', label: 'Revival', excerpt: 'Thousands of students have gathered for continuous worship services now entering their second week on campus. University officials say it began spontaneously during a routine chapel service and has since drawn national attention.', body: '<p>Thousands of students have gathered for continuous worship services now entering their second week on the University of Kentucky campus. University officials say it began spontaneously during a routine chapel service and has since drawn national attention from churches, media outlets, and curious onlookers across the country.</p><p>What started as a regular Wednesday evening chapel has transformed into an around-the-clock gathering of praise, prayer, and repentance. Students have been streaming in from neighboring universities, some driving hours to participate in what many are calling a genuine move of God.</p><p>"We\'ve never seen anything like this," said campus chaplain Rev. Thomas Walker. "Students are weeping, confessing sin, reconciling with one another — it\'s raw and it\'s real."</p><p>The spontaneous revival echoes similar movements in American history, from the First Great Awakening to the Asbury revival of 2023. Theologians and church leaders are watching closely, with many urging discernment alongside celebration.</p>', slug: 'revival-breaks-out-university-kentucky', featured: true, published: true },
    { title: 'Underground Churches in China Report Record Growth Despite Crackdowns', subtitle: 'House church networks spread rapidly through rural provinces', author: 'Grace Chen', section: 'faith', label: 'Missions', excerpt: 'New estimates suggest the persecuted church has doubled in size over the past decade, with house church networks spreading rapidly through rural provinces and increasingly into major cities.', body: '<p>New estimates from international ministry watchdog groups suggest the persecuted church in China has doubled in size over the past decade, despite intensifying government surveillance and crackdowns on religious gatherings.</p><p>House church networks are spreading rapidly through rural provinces and increasingly into major urban centers, where young professionals are finding faith through small, intimate gatherings in apartments and coffee shops.</p><p>"The Chinese government thought they could stamp out Christianity with technology and intimidation," said one ministry leader who requested anonymity for safety reasons. "Instead, they\'ve created the conditions for explosive growth."</p><p>Estimates of China\'s Christian population now range from 100 to 130 million, making it one of the largest Christian populations in the world. Many believers meet in networks of 10-15 people, rotating locations to avoid detection.</p>', slug: 'underground-churches-china-record-growth', featured: false, published: true },
    { title: 'The Surprising Return of Small Group Bible Studies Among Gen Z', subtitle: 'Young adults rediscover intimate Scripture-focused gatherings', author: 'Emily Hart', section: 'faith', label: 'Discipleship', excerpt: 'After years of declining church attendance among young adults, a counter-trend is emerging: intimate, Scripture-focused gatherings in living rooms and coffee shops across the country.', body: '<p>After years of declining church attendance among young adults, a surprising counter-trend is emerging across the United States: Gen Z is gravitating toward intimate, Scripture-focused gatherings in living rooms, coffee shops, and college dorm rooms.</p><p>Unlike the megachurch model that defined their parents\' generation, these young believers are seeking depth over spectacle. They want to wrestle with the text, ask hard questions, and build authentic community around the Word of God.</p><p>"I got tired of church feeling like a concert followed by a TED talk," said Maya Johnson, 22, who hosts a weekly Bible study in her Atlanta apartment. "We just open the Bible and talk about what it actually says. It\'s changed my life."</p><p>Church researchers say this trend represents not a rejection of church but a hunger for the kind of spiritual formation that larger gatherings sometimes struggle to provide.</p>', slug: 'gen-z-small-group-bible-studies', featured: false, published: true },

    // POLITICS (3)
    { title: 'Supreme Court to Hear Landmark Religious Liberty Case This Fall', subtitle: 'Case could redefine the boundaries of faith in public life', author: 'Daniel Crawford', section: 'politics', label: 'Religious Liberty', excerpt: 'The Supreme Court has agreed to hear a case that legal scholars say could be the most significant religious liberty ruling in a generation, with implications for churches, schools, and faith-based organizations nationwide.', body: '<p>The Supreme Court has agreed to hear a case that legal scholars say could be the most significant religious liberty ruling in a generation. The case, which involves a faith-based adoption agency\'s right to operate according to its religious convictions, has implications for churches, Christian schools, and faith-based organizations nationwide.</p><p>At the heart of the dispute is whether government can require religious organizations to violate their sincerely held beliefs as a condition of participating in public programs. Lower courts have been divided on the issue, creating a patchwork of rulings across the country.</p><p>"This case will determine whether people of faith can fully participate in public life without checking their beliefs at the door," said lead attorney Rebecca Marshall. "The stakes could not be higher."</p><p>Oral arguments are expected in October, with a decision likely by next summer. Both sides are mobilizing grassroots support, recognizing the case\'s potential to reshape the relationship between church and state for decades to come.</p>', slug: 'supreme-court-religious-liberty-case', featured: false, published: true },
    { title: 'Faith Leaders Call for Bipartisan Immigration Reform Rooted in Scripture', subtitle: 'Evangelical and Catholic leaders present unified proposal', author: 'Marcus Reid', section: 'politics', label: 'Policy', excerpt: 'A coalition of evangelical and Catholic leaders has unveiled a bipartisan immigration reform framework they say is grounded in biblical principles of justice, mercy, and the rule of law.', body: '<p>A broad coalition of evangelical and Catholic leaders has unveiled a bipartisan immigration reform framework they say is grounded in biblical principles of justice, mercy, and the rule of law.</p><p>The proposal, signed by over 200 church leaders, calls for a secure border, a pathway for long-term residents, protection for families, and reformed legal immigration channels — all framed through the lens of Scripture\'s commands to welcome the stranger while respecting governing authorities.</p><p>"Christians should be leading on this issue, not retreating to partisan corners," said Bishop Robert Salinas, one of the framework\'s architects. "The Bible has more to say about immigrants than almost any other social issue."</p><p>The proposal has drawn cautious interest from lawmakers on both sides of the aisle, though significant political hurdles remain. Leaders say they plan a national tour of churches to build grassroots support for the framework.</p>', slug: 'faith-leaders-bipartisan-immigration-reform', featured: false, published: true },
    { title: 'How Christians Are Shaping School Board Elections Across America', subtitle: 'Parents of faith mobilize at the local level in record numbers', author: 'Laura Bennett', section: 'politics', label: 'Elections', excerpt: 'Christian parents are running for and winning school board seats in unprecedented numbers, driven by concerns about curriculum, parental rights, and the role of faith in public education.', body: '<p>Across the country, Christian parents are running for and winning school board seats in unprecedented numbers, driven by concerns about curriculum content, parental rights, and the role of faith and values in public education.</p><p>What started as scattered grassroots efforts has coalesced into a national movement, with training organizations and church networks equipping believers to engage effectively in local governance.</p><p>"For too long, Christians sat out local elections," said training coordinator Patricia Owens. "Now parents realize that the school board may be the most important elected body affecting their children\'s daily lives."</p><p>Critics accuse the movement of attempting to impose religious values on public institutions, but supporters counter that they are simply exercising their democratic rights as parents and citizens. The trend shows no signs of slowing ahead of the next election cycle.</p>', slug: 'christians-shaping-school-board-elections', featured: false, published: true },

    // CULTURE (3)
    { title: 'The Chosen Breaks Streaming Records with Season 5 Premiere', subtitle: 'Faith-based series continues to defy industry expectations', author: 'Jessica Morales', section: 'culture', label: 'Entertainment', excerpt: 'The crowdfunded series about the life of Jesus has shattered streaming records with its Season 5 premiere, proving that audiences are hungry for faith-driven storytelling.', body: '<p>The Chosen, the crowdfunded series depicting the life of Jesus Christ, has shattered streaming records with its Season 5 premiere, drawing over 50 million viewers in its opening weekend across multiple platforms.</p><p>The series, created by Dallas Jenkins, has become a cultural phenomenon that has defied every prediction the entertainment industry made about faith-based content. What began as a small project funded by everyday believers has grown into one of the most-watched series in the world.</p><p>"Hollywood said nobody wanted to watch a show about Jesus," Jenkins said at the premiere event. "Turns out, they were wrong."</p><p>The show\'s success has opened doors for other faith-based productions, with several major studios now actively developing projects aimed at Christian audiences. Industry analysts say The Chosen has proven that there is a massive, underserved market for quality content that takes faith seriously.</p>', slug: 'the-chosen-streaming-records-season-5', featured: false, published: true },
    { title: 'Why More Young Christians Are Leaving Social Media for Good', subtitle: 'A growing movement toward digital fasting and intentional living', author: 'Abigail Foster', section: 'culture', label: 'Technology', excerpt: 'A growing number of young Christians are permanently deleting their social media accounts, citing mental health concerns and a desire for deeper spiritual formation.', body: '<p>A growing number of young Christians are making the countercultural decision to permanently delete their social media accounts, citing mental health concerns, attention fragmentation, and a desire for deeper spiritual formation.</p><p>The trend, sometimes called "digital monasticism," goes beyond the occasional social media fast. These believers are making a permanent break, replacing scroll time with prayer, reading, and face-to-face community.</p><p>"I realized I was spending three hours a day on my phone and five minutes in the Word," said college student Nathan Park, who deleted all his accounts six months ago. "The math didn\'t add up for someone who claims to follow Jesus."</p><p>Churches are beginning to support the movement, with some offering "digital detox" small groups and providing practical resources for members seeking to reduce their screen dependence.</p>', slug: 'young-christians-leaving-social-media', featured: false, published: true },
    { title: 'Christian Authors Dominate Bestseller Lists in Surprising 2026 Trend', subtitle: 'Books on prayer, suffering, and biblical wisdom resonate broadly', author: 'Rachel Torres', section: 'culture', label: 'Books', excerpt: 'Christian authors are claiming an outsized share of major bestseller lists, with books on prayer, suffering, and biblical wisdom reaching audiences far beyond the church.', body: '<p>In a trend that has surprised the publishing industry, Christian authors are claiming an outsized share of major bestseller lists in 2026. Books on prayer, suffering, biblical wisdom, and the intersection of faith and daily life are resonating with audiences far beyond traditional church circles.</p><p>Industry analysts point to a broader cultural hunger for meaning and transcendence in an increasingly anxious and fragmented society. Readers are turning to authors who offer not just self-help but a coherent worldview grounded in something larger than themselves.</p><p>"People are tired of shallow optimism," said literary agent Karen McIntyre. "They want authors who have wrestled with real suffering and found something — Someone — worth holding onto."</p><p>The trend has led major publishers to expand their faith-based imprints, with several secular houses actively courting Christian writers for the first time.</p>', slug: 'christian-authors-dominate-bestseller-lists', featured: false, published: true },

    // WORLD (3)
    { title: 'Persecuted Christians in Nigeria Call for International Action After Church Attacks', subtitle: 'Violence against believers escalates in northern regions', author: 'Samuel Okafor', section: 'world', label: 'Persecution', excerpt: 'Nigerian Christians are pleading for international intervention as attacks on churches and Christian communities in the north continue to escalate, with hundreds killed this year alone.', body: '<p>Nigerian Christians are pleading for international intervention as violent attacks on churches and Christian communities in the country\'s northern regions continue to escalate. Hundreds of believers have been killed this year alone, with entire villages destroyed and thousands displaced.</p><p>The violence, attributed to both militant Islamist groups and armed Fulani herders, has created a humanitarian crisis that church leaders say the international community has largely ignored.</p><p>"The world watches and does nothing," said Pastor Emmanuel Adewale, whose church was burned last month. "Our people are dying for their faith, and we are asking — where is the global church?"</p><p>International advocacy groups are increasing pressure on governments and the United Nations to take concrete action, including targeted sanctions and increased humanitarian aid to affected communities. A delegation of African church leaders is scheduled to address the UN Human Rights Council next month.</p>', slug: 'persecuted-christians-nigeria-international-action', featured: false, published: true },
    { title: 'Massive Bible Translation Milestone: Scripture Now Available in 1,000 New Languages', subtitle: 'Global effort reaches communities previously without any translated Scripture', author: 'David Harmon', section: 'world', label: 'Missions', excerpt: 'Bible translation organizations announce a historic milestone: complete New Testament translations are now available in over 1,000 new languages, reaching communities that previously had no access to Scripture.', body: '<p>Bible translation organizations have announced a historic milestone: complete New Testament translations are now available in over 1,000 new languages reached in just the last decade, bringing Scripture to communities that previously had no access to the Word of God in their mother tongue.</p><p>The achievement represents a dramatic acceleration in translation work, driven by new technologies, innovative partnerships, and a growing movement of native-speaker translators working in their own communities.</p><p>"For the first time in history, we can see the finish line," said translation ministry director Dr. Paul Simmons. "Every language group on earth could have access to Scripture within our lifetime."</p><p>The remaining work focuses on approximately 1,600 languages, many spoken by small, remote communities. Organizations are leveraging AI-assisted translation tools alongside native speakers to accelerate the final push.</p>', slug: 'bible-translation-milestone-1000-languages', featured: false, published: true },
    { title: 'South Korean Missionaries Lead Unprecedented Growth in Central Asia', subtitle: 'Churches planted in regions once considered unreachable', author: 'Grace Chen', section: 'world', label: 'Missions', excerpt: 'South Korean missionaries are driving unprecedented church growth across Central Asia, planting congregations in regions that were considered unreachable just a generation ago.', body: '<p>South Korean missionaries are driving unprecedented church growth across Central Asia, planting congregations in regions that were considered spiritually unreachable just a generation ago. Countries like Kazakhstan, Uzbekistan, and Kyrgyzstan are seeing small but vibrant Christian communities take root.</p><p>South Korea, which sends more missionaries per capita than any other country, has focused significant resources on the so-called "10/40 Window" — the band of countries between 10 and 40 degrees north latitude where the majority of the world\'s unreached people groups live.</p><p>"Korean missionaries bring an unusual combination of fervent prayer, sacrificial commitment, and cultural adaptability," said missions researcher Dr. Andrew Kim. "They go where others won\'t, and they stay."</p><p>The growth has not been without challenges. Missionaries face government restrictions, cultural barriers, and in some areas, physical danger. But church leaders say the fruit of their labor is undeniable and growing.</p>', slug: 'south-korean-missionaries-central-asia-growth', featured: false, published: true },

    // OPINION (3)
    { title: 'The Church Cannot Afford to Be Silent on Artificial Intelligence', subtitle: 'Why pastors and theologians must engage the AI revolution now', author: 'Dr. Michael Thornton', section: 'opinion', label: 'Opinion', excerpt: 'As artificial intelligence reshapes every aspect of society, the church faces a critical choice: engage thoughtfully with the technology now, or be left scrambling to respond to its consequences later.', body: '<p>As artificial intelligence reshapes every aspect of human society — from medicine and education to warfare and art — the church faces a critical choice: engage thoughtfully with the technology now, or be left scrambling to respond to its moral and spiritual consequences later.</p><p>Too many pastors and church leaders are treating AI as a tech industry curiosity rather than what it truly is: the most significant shift in human capability since the printing press, with profound implications for our understanding of what it means to be made in the image of God.</p><p>We need theologians and ethicists at the table where these decisions are being made, not because we have all the answers, but because we bring something the tech industry desperately lacks: a framework for human dignity, moral responsibility, and the limits of human authority over creation.</p><p>The time for hand-wringing is over. The church must develop clear, biblical thinking on AI — and we must do it now, before the window of influence closes.</p>', slug: 'church-cannot-be-silent-artificial-intelligence', featured: false, published: true },
    { title: 'Stop Treating Doubt as the Enemy of Faith', subtitle: 'Honest questioning is not the opposite of belief — it is the path to deeper trust', author: 'Anna Westbrook', section: 'opinion', label: 'Opinion', excerpt: 'We have created a church culture where admitting doubt feels like confessing sin. But the Bible is full of people who questioned God — and were drawn closer to Him through the struggle.', body: '<p>We have created a church culture where admitting doubt feels like confessing a terrible sin. Ask a hard question in Sunday school and you get nervous looks. Express uncertainty about a doctrine and people question your salvation. Wonder aloud whether God is really there, and you might find yourself quietly removed from the worship team.</p><p>But the Bible tells a different story. The Psalms are full of anguished questions. Job demanded answers from God. Thomas refused to believe without evidence — and Jesus didn\'t rebuke him for it. He showed up and met Thomas exactly where he was.</p><p>Doubt is not the enemy of faith. Dishonesty is. Pretending to have certainty you don\'t possess is not spiritual maturity — it\'s performance. And it\'s driving away an entire generation of young believers who would rather be honest doubters than fake believers.</p><p>The church that welcomes honest questions will be the church that produces the deepest faith. Let\'s start making room for the struggle.</p>', slug: 'stop-treating-doubt-enemy-of-faith', featured: false, published: true },
    { title: 'Why Every Christian Should Read More History', subtitle: 'We are not the first generation to face these challenges', author: 'Prof. James Whitfield', section: 'opinion', label: 'Opinion', excerpt: 'Christians today act as though the challenges we face are unprecedented. A deeper knowledge of church history would reveal that the saints who came before us faced far worse — and they overcame.', body: '<p>There is a peculiar arrogance in every generation that believes its challenges are unprecedented. Today\'s Christians are no exception. We talk about the hostility of secular culture, the decline of church attendance, and the moral confusion of our age as though no believers have ever faced such things before.</p><p>A passing familiarity with church history would cure us of this myopia. The early church thrived under literal persecution. The medieval church preserved civilization through centuries of chaos. The Reformers risked their lives to recover the gospel. Believers in Communist countries maintained vibrant faith under totalitarian regimes.</p><p>Reading history does not minimize our challenges — it contextualizes them. It gives us perspective, models of faithfulness, and the confidence that the gates of hell have not prevailed against the church for two thousand years, and they will not prevail now.</p><p>Put down the hot takes. Pick up a history book. You\'ll find you are not alone, and you are not the first.</p>', slug: 'why-every-christian-should-read-more-history', featured: false, published: true },

    // THEOLOGY (3)
    { title: 'Rediscovering the Doctrine of Creation in an Age of Anxiety', subtitle: 'How Genesis 1 speaks directly to our modern restlessness', author: 'Dr. Katherine Wells', section: 'theology', label: 'Doctrine', excerpt: 'In an age defined by anxiety and uncertainty, the doctrine of creation offers something radical: the assurance that the world is not chaos but the purposeful work of a sovereign, loving God.', body: '<p>We live in an age defined by anxiety. Climate fears, political instability, technological disruption, and social fragmentation have created a pervasive sense that the world is spinning out of control. Into this anxiety, the doctrine of creation speaks a radical word.</p><p>Genesis 1 does not merely tell us how the world began — it tells us what kind of world we live in. It is not chaos. It is not accident. It is the purposeful, ordered, and good work of a sovereign Creator who spoke light into darkness and called it good.</p><p>This doctrine has profound implications for how we live. If God created the world with order and purpose, then meaning is not something we manufacture — it is something we discover. If humanity is made in God\'s image, then every person possesses inherent dignity that no government, market, or algorithm can grant or revoke.</p><p>The doctrine of creation is not a relic of pre-scientific thinking. It is the foundation upon which all Christian theology — and all Christian hope — is built.</p>', slug: 'rediscovering-doctrine-creation-age-of-anxiety', featured: false, published: true },
    { title: 'What the Early Church Fathers Can Teach Us About Biblical Interpretation', subtitle: 'Ancient wisdom for reading Scripture with depth and humility', author: 'Dr. Peter Liang', section: 'theology', label: 'Church History', excerpt: 'The early church fathers developed rich, sophisticated approaches to reading Scripture that modern Christians have largely forgotten — and desperately need to recover.', body: '<p>Modern Christians often approach the Bible as though no one read it seriously before the Reformation. We jump from the apostles to Luther as if fifteen centuries of careful, prayerful biblical interpretation simply did not happen.</p><p>The early church fathers — Origen, Augustine, Chrysostom, Athanasius, and others — developed rich, sophisticated approaches to reading Scripture that rewarded careful attention, expected multiple layers of meaning, and always oriented interpretation toward Christ.</p><p>Their approach was not less rigorous than modern methods — it was differently rigorous. They combined grammatical precision with theological depth, historical awareness with spiritual sensitivity. They read the Bible as a unified story with Jesus at the center, not as a collection of isolated proof texts.</p><p>Recovering their wisdom does not mean abandoning modern scholarship. It means enriching it. The fathers remind us that reading Scripture is not merely an intellectual exercise — it is a spiritual discipline that requires humility, prayer, and the guidance of the Holy Spirit.</p>', slug: 'early-church-fathers-biblical-interpretation', featured: false, published: true },
    { title: 'The Forgotten Doctrine of Vocation: Finding God in Ordinary Work', subtitle: 'Luther\'s revolutionary idea that all honest work is sacred', author: 'Rev. Thomas Walker', section: 'theology', label: 'Doctrine', excerpt: 'Martin Luther\'s doctrine of vocation demolished the sacred-secular divide, teaching that the farmer, the merchant, and the parent serve God just as truly as the priest. We need this teaching now more than ever.', body: '<p>When Martin Luther articulated the doctrine of vocation, he demolished a wall that had divided Christian life for over a thousand years: the wall between sacred and secular work. In Luther\'s understanding, the farmer plowing a field, the mother nursing a child, and the magistrate administering justice are all doing holy work — work through which God Himself cares for His creation.</p><p>This revolutionary idea transformed how ordinary Christians understood their daily lives. Work was no longer something to endure until you could get to church. Work itself was a form of worship, a channel through which God\'s love and provision flow to the world.</p><p>We desperately need to recover this teaching today. Too many Christians see their jobs as spiritually meaningless, their "real" ministry confined to church activities. But the doctrine of vocation says otherwise: wherever you are, whatever honest work you do, God is present in it and working through it.</p><p>Your desk, your kitchen, your classroom, your workshop — these are not lesser arenas of faith. They are the very places where your faith becomes concrete, tangible, and real.</p>', slug: 'forgotten-doctrine-vocation-ordinary-work', featured: false, published: true },

    // CHURCH (3)
    { title: 'Small Churches Are Thriving — and Here Is What Megachurches Can Learn', subtitle: 'New research challenges the bigger-is-better assumption', author: 'Pastor John Reeves', section: 'church', label: 'Church Life', excerpt: 'New research shows that small churches consistently outperform megachurches in key measures of discipleship, community, and per-capita generosity — challenging the assumption that bigger is always better.', body: '<p>New research from the National Congregations Study is challenging one of American Christianity\'s most persistent assumptions: that bigger churches are better churches.</p><p>The data shows that small congregations — those with fewer than 100 members — consistently outperform larger churches in several key measures: per-capita giving, member participation in service and ministry, depth of interpersonal relationships, and effectiveness of pastoral care.</p><p>"Small churches do things that large churches structurally cannot," said lead researcher Dr. Helen Park. "When everyone knows your name, accountability is organic. When the pastor knows your family, care is personal. These things are incredibly difficult to replicate at scale."</p><p>None of this means megachurches are failing — many do extraordinary work. But the research suggests that the American church\'s obsession with growth and scale may have blinded us to the unique and irreplaceable strengths of small, faithful congregations.</p>', slug: 'small-churches-thriving-megachurches-learn', featured: false, published: true },
    { title: 'The Pastor Burnout Crisis: New Survey Reveals Alarming Numbers', subtitle: 'Nearly half of pastors have considered leaving ministry in the past year', author: 'Laura Bennett', section: 'church', label: 'Ministry', excerpt: 'A new Barna survey reveals that 48% of pastors have seriously considered leaving full-time ministry in the past twelve months, driven by burnout, isolation, and unrealistic congregational expectations.', body: '<p>A sweeping new survey from the Barna Group has laid bare the depth of the pastoral burnout crisis in American churches. According to the data, 48% of pastors have seriously considered leaving full-time ministry in the past twelve months — a number that has nearly doubled since 2015.</p><p>The top drivers of burnout include unrealistic congregational expectations, financial stress, isolation, political division within churches, and the lingering effects of the pandemic on church culture and attendance.</p><p>"Pastors are expected to be CEO, counselor, theologian, fundraiser, and social media manager — all while maintaining their own spiritual health and family life," said Barna president David Kinnaman. "It\'s an unsustainable model."</p><p>Church leaders and denominational officials are beginning to respond, with new initiatives focused on pastoral sabbaticals, mental health support, and restructuring ministry expectations to be more sustainable. But many say the changes are coming too slowly for pastors already at the breaking point.</p>', slug: 'pastor-burnout-crisis-survey-alarming-numbers', featured: false, published: true },
    { title: 'Multi-Ethnic Churches Growing Faster Than Any Other Type in America', subtitle: 'Congregations reflect the demographic future of American Christianity', author: 'Marcus Reid', section: 'church', label: 'Church Growth', excerpt: 'Multi-ethnic congregations are the fastest-growing segment of American Christianity, as churches intentionally pursue the biblical vision of every tribe, tongue, and nation worshiping together.', body: '<p>Multi-ethnic congregations — churches where no single racial or ethnic group comprises more than 80% of the membership — are the fastest-growing segment of American Christianity, according to new data from the Hartford Institute for Religion Research.</p><p>The growth reflects both demographic shifts in American communities and an intentional movement among church leaders to pursue the biblical vision of Revelation 7: every tribe, tongue, and nation gathered together in worship.</p><p>"For too long, Sunday morning was the most segregated hour in America," said Pastor David Kim of Mosaic Church in Los Angeles. "That\'s changing, and it\'s changing because leaders are making it a priority, not waiting for it to happen naturally."</p><p>The transition is not without challenges. Multi-ethnic churches must navigate differences in worship style, cultural expectations, and sometimes painful conversations about race and justice. But leaders say the fruit — deeper unity, broader perspective, and a more credible witness to the world — is well worth the effort.</p>', slug: 'multi-ethnic-churches-growing-fastest-america', featured: false, published: true }
  ];

  for (const a of articles) {
    await sql`
      INSERT INTO articles (title, subtitle, author, section, label, body, excerpt, image_url, slug, featured, published)
      VALUES (${a.title}, ${a.subtitle}, ${a.author}, ${a.section}, ${a.label}, ${a.body}, ${a.excerpt}, '', ${a.slug}, ${a.featured}, ${a.published})
    `;
  }
}

// --- Password helpers ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

// --- Admin ---
async function verifyAdmin(username, password) {
  await initTables();
  const { rows } = await sql`SELECT * FROM admin_users WHERE username = ${username}`;
  if (!rows.length) return null;
  const user = rows[0];
  if (verifyPassword(password, user.password_hash, user.salt)) {
    return { id: user.id, username: user.username };
  }
  return null;
}

async function changeAdminPassword(username, newPassword) {
  const { hash, salt } = hashPassword(newPassword);
  await sql`UPDATE admin_users SET password_hash = ${hash}, salt = ${salt} WHERE username = ${username}`;
}

// --- Subscribers ---
async function addSubscriber(email, name, source) {
  await initTables();
  try {
    await sql`INSERT INTO subscribers (email, name, source) VALUES (${email}, ${name || ''}, ${source || 'newsletter'})`;
    return { success: true };
  } catch (e) {
    if (e.message && e.message.includes('unique') || e.message.includes('duplicate')) {
      return { success: false, error: 'Email already subscribed' };
    }
    throw e;
  }
}

async function getSubscribers(page, limit, search) {
  await initTables();
  page = page || 1;
  limit = limit || 50;
  const offset = (page - 1) * limit;

  let total, rows;
  if (search) {
    const pattern = '%' + search + '%';
    const countResult = await sql`SELECT COUNT(*) as total FROM subscribers WHERE email ILIKE ${pattern} OR name ILIKE ${pattern}`;
    total = parseInt(countResult.rows[0].total);
    const result = await sql`SELECT * FROM subscribers WHERE email ILIKE ${pattern} OR name ILIKE ${pattern} ORDER BY subscribed_at DESC LIMIT ${limit} OFFSET ${offset}`;
    rows = result.rows;
  } else {
    const countResult = await sql`SELECT COUNT(*) as total FROM subscribers`;
    total = parseInt(countResult.rows[0].total);
    const result = await sql`SELECT * FROM subscribers ORDER BY subscribed_at DESC LIMIT ${limit} OFFSET ${offset}`;
    rows = result.rows;
  }
  return { subscribers: rows, total, page, limit };
}

async function deleteSubscriber(id) {
  await sql`DELETE FROM subscribers WHERE id = ${id}`;
}

async function exportSubscribers() {
  await initTables();
  const { rows } = await sql`SELECT email, name, source, subscribed_at, active FROM subscribers ORDER BY subscribed_at DESC`;
  return rows;
}

// --- Articles ---
async function createSlug(title) {
  let slug = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
  const { rows } = await sql`SELECT id FROM articles WHERE slug = ${slug}`;
  if (rows.length) {
    slug += '-' + Date.now().toString(36);
  }
  return slug;
}

async function createArticle(data) {
  await initTables();
  const slug = await createSlug(data.title);
  const result = await sql`
    INSERT INTO articles (title, subtitle, author, section, label, body, excerpt, image_url, slug, featured, published)
    VALUES (${data.title}, ${data.subtitle || ''}, ${data.author}, ${data.section},
            ${data.label || data.section}, ${data.body}, ${data.excerpt || ''},
            ${data.image_url || ''}, ${slug}, ${!!data.featured}, ${!!data.published})
    RETURNING id
  `;
  return { id: result.rows[0].id, slug };
}

async function updateArticle(id, data) {
  await sql`
    UPDATE articles SET title=${data.title}, subtitle=${data.subtitle || ''}, author=${data.author},
    section=${data.section}, label=${data.label || data.section}, body=${data.body},
    excerpt=${data.excerpt || ''}, image_url=${data.image_url || ''},
    featured=${!!data.featured}, published=${!!data.published}, updated_at=NOW()
    WHERE id=${id}
  `;
}

async function deleteArticle(id) {
  await sql`DELETE FROM articles WHERE id = ${id}`;
}

async function getArticles(page, limit, section, published) {
  await initTables();
  page = page || 1;
  limit = limit || 20;
  const offset = (page - 1) * limit;

  let total, rows;
  if (section && published !== undefined) {
    const countResult = await sql`SELECT COUNT(*) as total FROM articles WHERE section=${section} AND published=${published}`;
    total = parseInt(countResult.rows[0].total);
    const result = await sql`SELECT * FROM articles WHERE section=${section} AND published=${published} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    rows = result.rows;
  } else if (section) {
    const countResult = await sql`SELECT COUNT(*) as total FROM articles WHERE section=${section}`;
    total = parseInt(countResult.rows[0].total);
    const result = await sql`SELECT * FROM articles WHERE section=${section} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    rows = result.rows;
  } else if (published !== undefined) {
    const countResult = await sql`SELECT COUNT(*) as total FROM articles WHERE published=${published}`;
    total = parseInt(countResult.rows[0].total);
    const result = await sql`SELECT * FROM articles WHERE published=${published} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    rows = result.rows;
  } else {
    const countResult = await sql`SELECT COUNT(*) as total FROM articles`;
    total = parseInt(countResult.rows[0].total);
    const result = await sql`SELECT * FROM articles ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    rows = result.rows;
  }
  return { articles: rows, total, page, limit };
}

async function getArticleById(id) {
  const { rows } = await sql`SELECT * FROM articles WHERE id = ${id}`;
  return rows[0] || null;
}

async function getArticleBySlug(slug) {
  const { rows } = await sql`SELECT * FROM articles WHERE slug = ${slug} AND published = TRUE`;
  return rows[0] || null;
}

async function getPublishedArticles(section, limit) {
  await initTables();
  limit = limit || 10;
  if (section) {
    const { rows } = await sql`SELECT * FROM articles WHERE published = TRUE AND section = ${section} ORDER BY created_at DESC LIMIT ${limit}`;
    return rows;
  }
  const { rows } = await sql`SELECT * FROM articles WHERE published = TRUE ORDER BY created_at DESC LIMIT ${limit}`;
  return rows;
}

// --- Images ---
async function saveImageRecord(filename, originalName, mimeType, size, url) {
  await initTables();
  await sql`INSERT INTO images (filename, original_name, mime_type, size, url) VALUES (${filename}, ${originalName}, ${mimeType}, ${size}, ${url})`;
  return url;
}

async function getImages(page, limit) {
  await initTables();
  page = page || 1;
  limit = limit || 30;
  const offset = (page - 1) * limit;
  const countResult = await sql`SELECT COUNT(*) as total FROM images`;
  const total = parseInt(countResult.rows[0].total);
  const { rows } = await sql`SELECT * FROM images ORDER BY uploaded_at DESC LIMIT ${limit} OFFSET ${offset}`;
  return { images: rows, total, page, limit };
}

async function deleteImageRecord(id) {
  const { rows } = await sql`SELECT * FROM images WHERE id = ${id}`;
  if (rows.length) {
    await sql`DELETE FROM images WHERE id = ${id}`;
  }
  return rows[0] || null;
}

// --- Payments ---
async function recordPayment(email, plan, amount, squarePaymentId) {
  await initTables();
  await sql`INSERT INTO payments (email, plan, amount, square_payment_id) VALUES (${email}, ${plan}, ${amount}, ${squarePaymentId || ''})`;
}

async function getPayments(page, limit) {
  await initTables();
  page = page || 1;
  limit = limit || 50;
  const offset = (page - 1) * limit;
  const countResult = await sql`SELECT COUNT(*) as total FROM payments`;
  const total = parseInt(countResult.rows[0].total);
  const { rows } = await sql`SELECT * FROM payments ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  return { payments: rows, total, page, limit };
}

// --- Stats ---
async function getDashboardStats() {
  await initTables();
  const s = await sql`SELECT COUNT(*) as cnt FROM subscribers WHERE active = TRUE`;
  const a = await sql`SELECT COUNT(*) as cnt FROM articles`;
  const p = await sql`SELECT COUNT(*) as cnt FROM articles WHERE published = TRUE`;
  const i = await sql`SELECT COUNT(*) as cnt FROM images`;
  const pay = await sql`SELECT COUNT(*) as cnt FROM payments`;
  const rs = await sql`SELECT * FROM subscribers ORDER BY subscribed_at DESC LIMIT 5`;
  const ra = await sql`SELECT id, title, section, author, published, created_at FROM articles ORDER BY created_at DESC LIMIT 5`;
  return {
    totalSubscribers: parseInt(s.rows[0].cnt),
    totalArticles: parseInt(a.rows[0].cnt),
    publishedArticles: parseInt(p.rows[0].cnt),
    totalImages: parseInt(i.rows[0].cnt),
    totalPayments: parseInt(pay.rows[0].cnt),
    recentSubscribers: rs.rows,
    recentArticles: ra.rows
  };
}

module.exports = {
  initTables, verifyAdmin, changeAdminPassword,
  addSubscriber, getSubscribers, deleteSubscriber, exportSubscribers,
  createArticle, updateArticle, deleteArticle, getArticles, getArticleById, getArticleBySlug, getPublishedArticles,
  saveImageRecord, getImages, deleteImageRecord,
  recordPayment, getPayments,
  getDashboardStats
};
