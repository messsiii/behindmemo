"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"

const content = {
  en: {
    title: '"On Writing Letters" - A Small Matter of Great Importance',
    author: "behindMemory",
    paragraphs: [
      "It's rather amusing that in this age of technological advancement, writing a letter has become such a challenging task. Not that writing itself is particularly difficult. Look around - people today are incredibly smart. They're proficient with all sorts of tools, expert at sending emojis, skilled at editing videos. Yet when it comes to this seemingly simple task of writing a letter, everyone stumbles. This reminds me of a friend, a programmer who spends his days writing complex code. When his mother fell ill, he wanted to write her a letter but sat in front of his computer for an entire day, only to end up sending a \"Take care\" emoji. It sounds ridiculous, but when you think about it, it feels painfully real.",
      "Marshall McLuhan had this theory (I know, citing theories sounds pretentious, but bear with me) about how modern humans are surrounded by \"hot media.\" In plain English, this means we've become so consumed by the endless scroll of short videos and the mindless tapping of emoji responses that we're processing too much pre-packaged information. In doing so, we've somehow managed to atrophy our ability to express ourselves. What's interesting is that now we have these \"magical\" tools like ChatGPT that can compose a seemingly heartfelt letter in seconds. But dear friend, doesn't this strike you as absurd? It's like wanting to hug someone you love but sending a robot to do it instead.",
      'This isn\'t about efficiency - it\'s about whether you truly want to express yourself. I\'ve worked face-to-face with people in writing workshops, helping what we might call "ordinary folks": taxi drivers, programmers, and lovely elderly people. They all started with the same disclaimer: "I can\'t write - I never studied literature." When I hear this, I can\'t help but think: did you need a literature degree when you were a child, hugging your mother tight and telling her "I love you"?',
      "To be honest, I studied literature (this sounds like bragging, but trust me, it's really not that special). But I can tell you with absolute certainty: writing well doesn't require a literature degree. It only requires you to face your feelings honestly, rather than avoiding them.",
      "Take another friend of mine. His letters to his girlfriend always read like a shopping list. I noticed he was avoiding something deeper, so I suggested he write to his mother instead. He paused - here was an emotional connection he couldn't evade. I knew the depth of their relationship was there; it just needed a trigger to release that powerful undercurrent. He said, \"I realized that over the past year, my phone's iCloud is full of thousands of photos, but only a handful are with my mom.\" This - this is the kind of writing that matters. Real writing. It's these simple, honest words that move people to tears.",
      "That's why we created this tool. Though we call it a tool, it's more like a friend. The first version might still feel tool-like - after all, people are busy, and we need to meet them where they are. But our ambition goes further. We want it to become a patient friend who gently prompts you when you're trying to escape, who guides you when you're struggling to dig deeper into yourself.",
      "Some might ask: \"How is this different from all the other AI writing tools out there?\" Well, it is different. Other tools might say, \"Give us your story, and we'll make it beautiful.\" We say, \"Share your story with us, and we'll help you find your own voice.\" This might be more challenging. It might make you remember things you'd rather forget, say things that make you uncomfortable, perhaps shed tears you'd rather hold back. But, dear friend, some things are worth the effort. Just as you can't outsource falling in love, you can't delegate speaking from your heart.",
      "One last thing: I love reading people's letters. Not because they're particularly well-written, but because in their awkward phrases, you can see something genuinely real. It reminds me of this truth: the most precious things in life are often clumsy. Like love. Like sincerity. Like the letter you're about to write.",
    ],
    signature: "Yours truly,",
  },
  zh: {
    title: '"写信这件小事" - 一件重要的小事',
    author: "behindMemory",
    paragraphs: [
      "在这个科技如此发达的时代，写一封信竟然成了如此具有挑战性的任务，这实在是有点好笑。并不是说写作本身有多难。看看周围——现在的人都非常聪明。他们精通各种工具，擅长发送表情包，善于剪辑视频。然而，当面对这个看似简单的写信任务时，每个人都踌躇不前。这让我想起了一个朋友，一个整天写复杂代码的程序员。当他母亲生病时，他想给她写封信，却在电脑前坐了整整一天，最后只发了个&quot;保重&quot;的表情。听起来很荒谬，但仔细想想，感觉却又如此真实。",
      "马歇尔·麦克卢汉有一个理论（我知道，引用理论听起来很装腔作势，但请耐心听我说完），说现代人被&quot;热媒体&quot;包围。用大白话说，就是我们被无休止的短视频滚动和无意识的表情回复所消耗，处理了太多预包装的信息。在这个过程中，我们不知不觉中丧失了表达自我的能力。有趣的是，现在我们有了像ChatGPT这样的&quot;神奇&quot;工具，可以在几秒钟内写出看似情真意切的信。但是亲爱的朋友，你不觉得这很荒谬吗？这就像你想拥抱你爱的人，却派了个机器人去做这件事。",
      "这不是关于效率的问题——而是关于你是否真的想表达自己。我曾在写作工作坊里面对面地帮助过我们可能称之为&quot;普通人&quot;的人：出租车司机、程序员和可爱的老年人。他们都以同样的免责声明开始：&quot;我不会写作——我从未学过文学。&quot;当我听到这个，我不禁想：当你还是个孩子，紧紧拥抱你的母亲，告诉她&quot;我爱你&quot;的时候，你需要文学学位吗？",
      "老实说，我学过文学（这听起来像是在炫耀，但相信我，这真的没什么特别的）。但我可以非常肯定地告诉你：写得好不需要文学学位。它只需要你诚实地面对你的感受，而不是逃避它们。",
      "再说说我的另一个朋友。他给女朋友的信总是读起来像购物清单。我注意到他在逃避更深层次的东西，所以我建议他给他母亲写信。他停顿了一下——这是一种他无法逃避的情感联系。我知道他们关系的深度就在那里；它只需要一个触发器来释放那强大的暗流。他说，&quot;我意识到，在过去的一年里，我手机的iCloud里存满了数千张照片，但只有寥寥几张是和妈妈的合影。&quot;这——这就是重要的写作。真实的写作。正是这些简单、诚实的话语让人感动落泪。",
      "这就是我们创建这个工具的原因。虽然我们称之为工具，但它更像是一个朋友。第一个版本可能仍然感觉像个工具——毕竟，人们都很忙，我们需要从他们所处的位置开始。但我们的野心不止于此。我们希望它成为一个耐心的朋友，在你试图逃避时轻轻提醒你，在你努力深入自我时引导你。",
      "有人可能会问：&quot;这和其他AI写作工具有什么不同？&quot;嗯，它确实不同。其他工具可能会说，&quot;给我们你的故事，我们会让它变得美丽。&quot;我们说，&quot;与我们分享你的故事，我们会帮助你找到自己的声音。&quot;这可能更具挑战性。它可能会让你想起你宁愿忘记的事情，说出让你不舒服的话，也许会流下你宁愿忍住的眼泪。但是，亲爱的朋友，有些事情值得付出努力。就像你不能外包爱情一样，你也不能委托别人说出你内心的话。",
      "最后一件事：我喜欢读人们的信。不是因为它们写得特别好，而是因为在那些笨拙的措辞中，你可以看到真实的东西。它让我想起这个真理：生活中最珍贵的东西往往是笨拙的。像爱情。像真诚。像你即将写的那封信。",
    ],
    signature: "真挚地，",
  },
}

export default function About() {
  const { language } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(135deg, 
              #738fbd 0%,
              #a8c3d4 20%,
              #dbd6df 40%,
              #ecc6c7 60%,
              #db88a4 80%,
              #cc8eb1 100%
            )
          `,
          opacity: 0.3,
        }}
      />

      <Nav />

      <main className="flex-grow relative z-10 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <motion.h1
            className={`text-4xl font-bold mb-8 text-center ${language === "en" ? "font-serif" : "font-serif-zh"}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {content[language].title}
          </motion.h1>

          {content[language].paragraphs.map((paragraph, index) => (
            <motion.p
              key={index}
              className={`mb-6 text-lg leading-relaxed ${language === "en" ? "font-literary" : "font-serif-zh"}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              {paragraph}
            </motion.p>
          ))}

          <motion.div
            className="mt-12 text-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <p className={`mb-2 ${language === "en" ? "font-literary" : "font-serif-zh"}`}>
              {content[language].signature}
            </p>
            <p className={`font-bold ${language === "en" ? "font-serif" : "font-serif-zh"}`}>
              {content[language].author}
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

