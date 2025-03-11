'use client'

import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion } from 'framer-motion'

const content = {
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last Updated: February 7, 2025',
    sections: [
      {
        title: '1. Introduction',
        content: "Behind Memory ('we', 'our', or 'us') is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.",
      },
      {
        title: '2. Information We Collect',
        content: 'We collect information that you provide directly to us, such as when you create an account, use our services, or contact us for support. This may include your name, email address, and the content of the letters you create. We also automatically collect certain information when you use our website, including your IP address, browser type, and usage data.',
      },
      {
        title: '3. How We Use Your Information',
        content: 'We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to comply with legal obligations. This includes using your information to generate AI-assisted memories based on your input. We do not use your personal information for automated decision-making or profiling.',
      },
      {
        title: '4. Data Storage and Security',
        content: 'We implement a variety of security measures to maintain the safety of your personal information. Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems, and are required to keep the information confidential.',
      },
      {
        title: '5. Your Data Protection Rights',
        content: 'Under the General Data Protection Regulation (GDPR), you have the right to access, rectify, or erase your personal data, as well as the right to restrict or object to our processing of your data. You also have the right to data portability. To exercise these rights, please contact us using the information provided at the end of this policy.',
      },
      {
        title: '6. Third-Party Disclosure',
        content: 'We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. This does not include trusted third parties who assist us in operating our website, conducting our business, or servicing you, as long as those parties agree to keep this information confidential.',
      },
      {
        title: '7. Cookies and Tracking Technologies',
        content: 'We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.',
      },
      {
        title: '8. Children\'s Privacy',
        content: 'Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us.',
      },
      {
        title: '9. Changes to This Privacy Policy',
        content: 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the \'Last Updated\' date at the top of this Privacy Policy.',
      },
      {
        title: '10. Contact Us',
        content: 'If you have any questions about this Privacy Policy, please contact us at: sean@behindmemory.com',
      },
    ],
  },
  zh: {
    title: '隐私政策',
    lastUpdated: '最后更新：2025年2月7日',
    sections: [
      {
        title: '1. 简介',
        content: 'Behind Memory（以下简称"我们"）致力于保护您的隐私。本隐私政策说明了我们在您使用我们的网站和服务时如何收集、使用、披露和保护您的信息。请仔细阅读本隐私政策。如果您不同意本隐私政策的条款，请不要访问本网站。',
      },
      {
        title: '2. 我们收集的信息',
        content: '我们收集您直接提供给我们的信息，例如当您创建账户、使用我们的服务或联系我们寻求支持时。这可能包括您的姓名、电子邮件地址和您创建的信件内容。我们还会自动收集您使用我们网站时的某些信息，包括您的IP地址、浏览器类型和使用数据。',
      },
      {
        title: '3. 我们如何使用您的信息',
        content: '我们使用收集的信息来提供、维护和改进我们的服务，与您沟通，并遵守法律义务。这包括使用您的信息基于您的输入生成AI辅助的记忆。我们不会将您的个人信息用于自动决策或分析。',
      },
      {
        title: '4. 数据存储和安全',
        content: '我们实施各种安全措施来维护您个人信息的安全。您的个人信息存储在安全网络之后，只有少数拥有特殊访问权限的人员才能访问这些系统，并且需要对信息保密。',
      },
      {
        title: '5. 您的数据保护权利',
        content: '根据《通用数据保护条例》(GDPR)，您有权访问、更正或删除您的个人数据，以及限制或反对我们处理您的数据的权利。您还有数据可携带性的权利。要行使这些权利，请使用本政策末尾提供的信息与我们联系。',
      },
      {
        title: '6. 第三方披露',
        content: '我们不会出售、交易或以其他方式将您的个人身份信息转让给外部各方。这不包括协助我们运营网站、开展业务或为您提供服务的可信第三方，只要这些方同意对这些信息保密。',
      },
      {
        title: '7. Cookie和跟踪技术',
        content: '我们使用cookie和类似的跟踪技术来跟踪我们服务上的活动并保存某些信息。您可以指示您的浏览器拒绝所有cookie或在发送cookie时发出提示。',
      },
      {
        title: '8. 儿童隐私',
        content: '我们的服务不面向13岁以下的任何人。我们不会故意收集13岁以下儿童的个人身份信息。如果您是父母或监护人，并且您知道您的孩子向我们提供了个人数据，请联系我们。',
      },
      {
        title: '9. 本隐私政策的变更',
        content: '我们可能会不时更新我们的隐私政策。我们会通过在此页面上发布新的隐私政策并更新隐私政策顶部的"最后更新"日期来通知您任何更改。',
      },
      {
        title: '10. 联系我们',
        content: '如果您对本隐私政策有任何问题，请通过以下方式联系我们：sean@behindmemory.com',
      },
    ],
  },
}

export default function Privacy() {
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

      <main className="relative z-10 flex-1">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`text-4xl font-bold text-center mb-4 ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
          >
            {content[language].title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center text-gray-500 mb-12"
          >
            {content[language].lastUpdated}
          </motion.p>

          {content[language].sections.map((section, index) => (
            <motion.section
              key={index}
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
            >
              <h2
                className={`text-2xl font-bold mb-4 ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
              >
                {section.title}
              </h2>
              <p
                className={`text-lg leading-relaxed ${language === 'en' ? 'font-literary' : 'font-serif-zh'}`}
              >
                {section.content}
              </p>
            </motion.section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
