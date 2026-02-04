/**
 * PoC用固定質問セット
 * テスト・デモ用に固定の10問を定義
 */

import type { Question } from '@/types/interview';

/**
 * PoC用固定質問セット（10問）
 * カテゴリ構成:
 * - introduction: 2問 (Q03, Q05)
 * - past_experience: 3問 (Q06, Q09, Q14)
 * - present_ability: 2問 (Q18, Q23)
 * - future_vision: 3問 (Q30, Q32, Q46)
 */
export const FIXED_QUESTIONS: Question[] = [
  // Introduction (2問)
  {
    id: 'Q03',
    order: 1,
    text: '日本の生活には慣れましたか？',
    spokenText: 'にほんの　せいかつには　なれましたか？',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['adaptability'],
  },
  {
    id: 'Q05',
    order: 2,
    text: '日本で好きな食べ物は何ですか？',
    spokenText: 'にほんで　すきな　たべものは　なんですか？',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['adaptability'],
  },
  // Past Experience (3問)
  {
    id: 'Q06',
    order: 3,
    text: '日本に来ようと思った理由を教えてください。',
    spokenText: 'にほんに　こようと　おもった　りゆうを　おしえてください。',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['initiative', 'retention'],
  },
  {
    id: 'Q09',
    order: 4,
    text: '日本で困った経験はありますか？どう対処しましたか？',
    spokenText: 'にほんで　こまった　けいけんは　ありますか？どう　たいしょ　しましたか？',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['adaptability', 'initiative'],
  },
  {
    id: 'Q14',
    order: 5,
    text: 'チームで何かを達成した経験を教えてください。',
    spokenText: 'チームで　なにかを　たっせいした　けいけんを　おしえてください。',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['cooperation'],
  },
  // Present Ability (2問)
  {
    id: 'Q18',
    order: 6,
    text: 'あなたの強みは何ですか？',
    spokenText: 'あなたの　つよみは　なんですか？',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['initiative'],
  },
  {
    id: 'Q23',
    order: 7,
    text: '分からないことがあったとき、どうしますか？',
    spokenText: 'わからないことが　あったとき、どうしますか？',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['communication'],
  },
  // Future Vision (3問)
  {
    id: 'Q30',
    order: 8,
    text: '当社を志望した理由を教えてください。',
    spokenText: 'とうしゃを　しぼうした　りゆうを　おしえてください。',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['initiative', 'retention'],
  },
  {
    id: 'Q32',
    order: 9,
    text: '5年後、どのようになっていたいですか？',
    spokenText: 'ごねんご、どのように　なっていたいですか？',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['retention', 'initiative'],
  },
  {
    id: 'Q46',
    order: 10,
    text: '何かご質問はありますか？',
    spokenText: 'なにか　ごしつもんは　ありますか？',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['initiative'],
  },
];

/**
 * 固定質問セットのベスト回答例
 * JLPTレベル: N3を想定
 */
export interface BestAnswer {
  questionId: string;
  questionText: string;
  bestAnswer: string;
  expectedScore: {
    vocabulary: number;
    grammar: number;
    content: number;
    honorifics: number;
    total: number;
  };
  keyPoints: string[];
}

export const BEST_ANSWERS: BestAnswer[] = [
  {
    questionId: 'Q03',
    questionText: '日本の生活には慣れましたか？',
    bestAnswer:
      'はい、だんだん慣れてきました。最初は電車の乗り換えや、ゴミの分別が難しかったですが、近所の方に教えていただいて、今は問題なくできるようになりました。日本の四季も好きです。特に春の桜がきれいで、毎年楽しみにしています。',
    expectedScore: {
      vocabulary: 80,
      grammar: 85,
      content: 90,
      honorifics: 75,
      total: 83,
    },
    keyPoints: [
      '具体的な困難とその克服を説明',
      '日本への適応と愛着を示す',
      'ポジティブな姿勢を伝える',
    ],
  },
  {
    questionId: 'Q05',
    questionText: '日本で好きな食べ物は何ですか？',
    bestAnswer:
      '私はラーメンが大好きです。特に味噌ラーメンが好きです。来日したばかりの頃、友達に連れて行ってもらったラーメン屋さんの味が忘れられません。今では、いろいろなお店を食べ歩くのが趣味になりました。日本の料理は味付けが繊細で、とても美味しいと思います。',
    expectedScore: {
      vocabulary: 75,
      grammar: 80,
      content: 85,
      honorifics: 70,
      total: 78,
    },
    keyPoints: [
      '具体的な料理名を挙げる',
      '日本での思い出を交える',
      '日本の食文化への関心を示す',
    ],
  },
  {
    questionId: 'Q06',
    questionText: '日本に来ようと思った理由を教えてください。',
    bestAnswer:
      '大学で日本語を専攻していたとき、日本の技術力の高さと、おもてなしの文化に魅力を感じました。また、日本のアニメや映画を通じて、日本の文化にとても興味を持ちました。将来は日本で技術を学んで、母国と日本の架け橋になりたいと考えて、来日を決めました。今は、毎日日本語を勉強しながら、日本の働き方も学んでいます。',
    expectedScore: {
      vocabulary: 85,
      grammar: 85,
      content: 90,
      honorifics: 75,
      total: 84,
    },
    keyPoints: [
      '来日理由が具体的で明確',
      '長期的なビジョンを示す',
      '日本文化への関心を伝える',
      '現在の努力も説明する',
    ],
  },
  {
    questionId: 'Q09',
    questionText: '日本で困った経験はありますか？どう対処しましたか？',
    bestAnswer:
      '来日したばかりのとき、病院で症状をうまく説明できなくて困りました。熱があることは伝えられましたが、それ以上の説明が難しかったです。そこで、スマホの翻訳アプリを使って、先生に症状を詳しく伝えることができました。それから、医療に関する日本語を勉強しました。「頭が痛い」「お腹が痛い」など、よく使う表現を覚えました。今は病院でも自分で説明できるようになりました。',
    expectedScore: {
      vocabulary: 80,
      grammar: 85,
      content: 95,
      honorifics: 75,
      total: 84,
    },
    keyPoints: [
      '具体的なエピソードを挙げる',
      '問題解決の行動を説明する',
      'その後の学びと成長を示す',
    ],
  },
  {
    questionId: 'Q14',
    questionText: 'チームで何かを達成した経験を教えてください。',
    bestAnswer:
      '日本語学校で、文化祭の実行委員をしました。私はベトナム料理のブースを担当しました。中国、ネパール、ベトナムの学生と協力して、準備をしました。言葉が違うので大変でしたが、みんなで絵を描いて説明したり、LINEグループで連絡したりしました。料理の味付けについて意見が分かれたときは、それぞれの国の良いところを取り入れることにしました。当日は200食以上売れて、「美味しい」と言ってもらえて、とても嬉しかったです。チームで協力することの大切さを学びました。',
    expectedScore: {
      vocabulary: 80,
      grammar: 85,
      content: 95,
      honorifics: 70,
      total: 83,
    },
    keyPoints: [
      '自分の役割を明確に説明',
      '困難と工夫を具体的に述べる',
      'チームへの貢献を示す',
      '成果を数字で表す',
      '学びを述べる',
    ],
  },
  {
    questionId: 'Q18',
    questionText: 'あなたの強みは何ですか？',
    bestAnswer:
      '私の強みは、コツコツと努力を続けられることです。日本語も、毎日2時間ずつ勉強して、1年でN4からN3に合格しました。勉強が大変なときもありましたが、諦めずに続けました。仕事でも、難しいことがあっても諦めずに続けることができます。前のアルバイトでは、レジの操作が最初は難しかったですが、毎日練習して、1か月後には一番早くなりました。店長から「頑張り屋さんだね」と言われて、嬉しかったです。',
    expectedScore: {
      vocabulary: 80,
      grammar: 85,
      content: 90,
      honorifics: 70,
      total: 81,
    },
    keyPoints: [
      '強みを明確に述べる',
      '具体的な実績で証明する',
      '第三者からの評価を加える',
      '仕事との関連性を示す',
    ],
  },
  {
    questionId: 'Q23',
    questionText: '分からないことがあったとき、どうしますか？',
    bestAnswer:
      'まず自分で調べてみます。インターネットで検索したり、マニュアルを読んだりします。それでも分からなければ、先輩や上司に質問します。質問するときは、「ここまでは分かったのですが、ここから分からないです」と具体的に聞くようにしています。そうすると、相手も答えやすいと思います。教えていただいたことはメモを取って、次からは自分でできるように努力します。同じことを何度も聞くのは申し訳ないので、一度聞いたことは忘れないようにしています。',
    expectedScore: {
      vocabulary: 85,
      grammar: 85,
      content: 95,
      honorifics: 75,
      total: 85,
    },
    keyPoints: [
      '自主性を示す（まず自分で調べる）',
      '報連相の姿勢を示す',
      '質問の仕方を工夫している',
      'メモを取る習慣がある',
      '相手への配慮を示す',
    ],
  },
  {
    questionId: 'Q30',
    questionText: '当社を志望した理由を教えてください。',
    bestAnswer:
      '御社を志望した理由は三つあります。一つ目は、外国人を大切にする会社だと思ったからです。御社のホームページで、外国人社員の方のインタビューを読みました。「成長できる環境」「先輩が優しく教えてくれる」という言葉が印象的でした。二つ目は、御社の技術に興味があるからです。私は将来、製造の仕事をしたいと思っていて、御社の品質管理の考え方を学びたいです。三つ目は、長く働ける会社だと感じたからです。私は日本で長く働きたいと考えているので、御社でキャリアを積んでいきたいです。',
    expectedScore: {
      vocabulary: 85,
      grammar: 85,
      content: 95,
      honorifics: 80,
      total: 86,
    },
    keyPoints: [
      '会社を調べていることを示す',
      '具体的な志望理由を挙げる',
      '自分のキャリアプランと結びつける',
      '長期就労の意欲を示す',
    ],
  },
  {
    questionId: 'Q32',
    questionText: '5年後、どのようになっていたいですか？',
    bestAnswer:
      '5年後は、現場のリーダーになりたいです。まず、入社して2年で仕事を覚えて、信頼される人になりたいです。3年目からは、後輩の教育も担当させていただきたいと思います。5年後には、日本人スタッフと外国人スタッフの架け橋になりたいです。私は外国人として、外国人スタッフの気持ちが分かります。日本語もN1を目指して勉強を続けます。将来は、御社の中核人材として、会社の成長に貢献したいと考えています。',
    expectedScore: {
      vocabulary: 85,
      grammar: 85,
      content: 95,
      honorifics: 75,
      total: 85,
    },
    keyPoints: [
      '具体的な年次計画を示す',
      'キャリアアップの意欲を示す',
      '自分の強み（外国人視点）を活かす',
      '日本語学習の継続を述べる',
      '会社への貢献を示す',
    ],
  },
  {
    questionId: 'Q46',
    questionText: '何かご質問はありますか？',
    bestAnswer:
      'はい、二つ質問があります。一つ目は、入社後の研修について教えていただけますか。どのような研修があるのか、知りたいです。二つ目は、御社で活躍されている外国人社員の方は、どのようなキャリアパスを歩まれているのか、お聞かせいただければ幸いです。私も御社で長く働いて、成長していきたいと考えておりますので、参考にさせていただきたいです。',
    expectedScore: {
      vocabulary: 85,
      grammar: 85,
      content: 90,
      honorifics: 85,
      total: 86,
    },
    keyPoints: [
      '仕事内容・成長に関する質問をする',
      '給料・休みの質問ばかりにしない',
      '意欲と関心を示す',
      '丁寧な敬語を使う',
    ],
  },
];

/**
 * 質問IDからベスト回答を取得
 */
export function getBestAnswerByQuestionId(questionId: string): BestAnswer | undefined {
  return BEST_ANSWERS.find((answer) => answer.questionId === questionId);
}

/**
 * 固定質問セットを使用するかどうかのフラグ
 * 本番環境ではfalseにして動的選択を使用
 */
export const USE_FIXED_QUESTIONS = true;
