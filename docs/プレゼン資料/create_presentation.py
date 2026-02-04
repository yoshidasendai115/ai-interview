#!/usr/bin/env python3
"""
AI面接プラットフォーム 投資家向けピッチ資料生成スクリプト
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import nsmap


# Alias for consistency
RgbColor = RGBColor


def create_slide_with_title(prs, title_text, layout_index=1):
    """タイトル付きスライドを作成"""
    slide_layout = prs.slide_layouts[layout_index]
    slide = prs.slides.add_slide(slide_layout)
    return slide


def set_shape_fill(shape, r, g, b):
    """図形の塗りつぶし色を設定"""
    shape.fill.solid()
    shape.fill.fore_color.rgb = RgbColor(r, g, b)


def add_title_shape(slide, text, top=Inches(0.3), font_size=32):
    """タイトルテキストを追加"""
    left = Inches(0.5)
    width = Inches(9)
    height = Inches(0.8)

    shape = slide.shapes.add_textbox(left, top, width, height)
    tf = shape.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = True
    p.font.color.rgb = RgbColor(0, 51, 102)  # ダークブルー
    return shape


def add_subtitle_shape(slide, text, top=Inches(1.1)):
    """サブタイトルを追加"""
    left = Inches(0.5)
    width = Inches(9)
    height = Inches(0.5)

    shape = slide.shapes.add_textbox(left, top, width, height)
    tf = shape.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(18)
    p.font.color.rgb = RgbColor(51, 102, 153)
    return shape


def add_bullet_points(slide, items, left=Inches(0.5), top=Inches(1.5), width=Inches(9), height=Inches(5)):
    """箇条書きを追加"""
    shape = slide.shapes.add_textbox(left, top, width, height)
    tf = shape.text_frame
    tf.word_wrap = True

    for i, item in enumerate(items):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()

        # インデントレベルの処理
        if isinstance(item, tuple):
            text, level = item
            p.text = "• " + text
            p.level = level
            p.font.size = Pt(16 if level == 0 else 14)
            if level > 0:
                p.font.color.rgb = RgbColor(80, 80, 80)
            else:
                p.font.color.rgb = RgbColor(51, 51, 51)
        else:
            p.text = "• " + item
            p.font.size = Pt(16)
            p.font.color.rgb = RgbColor(51, 51, 51)

        p.space_after = Pt(8)

    return shape


def add_centered_text(slide, text, top, font_size=24, bold=False, color=(51, 51, 51)):
    """中央揃えテキストを追加"""
    left = Inches(0.5)
    width = Inches(9)
    height = Inches(1)

    shape = slide.shapes.add_textbox(left, top, width, height)
    tf = shape.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = text
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = RgbColor(*color)
    return shape


def add_info_box(slide, title, items, left, top, width=Inches(4), height=Inches(2.5)):
    """情報ボックスを追加"""
    # ボックス背景
    box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    set_shape_fill(box, 240, 248, 255)  # 薄い青
    box.line.color.rgb = RgbColor(0, 102, 153)
    box.line.width = Pt(1)

    # タイトル
    title_box = slide.shapes.add_textbox(left + Inches(0.1), top + Inches(0.1), width - Inches(0.2), Inches(0.4))
    tf = title_box.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = RgbColor(0, 51, 102)

    # 内容
    content_box = slide.shapes.add_textbox(left + Inches(0.1), top + Inches(0.5), width - Inches(0.2), height - Inches(0.6))
    tf = content_box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE

    for i, item in enumerate(items):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = "• " + item
        p.font.size = Pt(11)
        p.font.color.rgb = RgbColor(51, 51, 51)
        p.space_after = Pt(4)

    return box


def add_header_line(slide):
    """ヘッダーライン（青い線）を追加"""
    line = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(0), Inches(0),
        Inches(10), Inches(0.08)
    )
    set_shape_fill(line, 0, 102, 153)
    line.line.fill.background()


def create_presentation():
    """プレゼンテーションを作成"""
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(7.5)

    # ========== スライド1: タイトル ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # 空白レイアウト

    # 背景の青いバー
    top_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(10), Inches(2.8))
    set_shape_fill(top_bar, 0, 82, 147)  # 青
    top_bar.line.fill.background()

    # mintokuロゴ的なテキスト
    mintoku_label = add_centered_text(slide, "mintoku 採用支援サービス 新機能", Inches(0.5), 16, False, (200, 220, 255))

    # タイトル
    title = add_centered_text(slide, "AI面接練習・評価機能（仮）", Inches(1.1), 40, True, (255, 255, 255))

    # キャッチコピー
    subtitle = add_centered_text(slide, "外国人採用の「見極め精度」を飛躍的に向上", Inches(2), 20, False, (220, 240, 255))

    # サブ情報
    add_centered_text(slide, "◯◯向け新サービス説明資料", Inches(4.5), 18, False, (100, 100, 100))
    add_centered_text(slide, "mintoku.com", Inches(5.5), 14, False, (0, 102, 153))
    add_centered_text(slide, "Confidential", Inches(6.5), 14, False, (150, 150, 150))

    # ========== スライド2: 市場機会 ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "市場機会")
    add_subtitle_shape(slide, "急成長する外国人労働者市場 × mintokuの顧客基盤")

    items = [
        "外国人労働者数: 2024年に200万人突破（過去最高を更新）",
        "特定技能ビザ制度の拡大（2024年: 対象分野を12→16に拡大）",
        "人手不足の深刻化（介護・建設・製造業・飲食業など）",
    ]
    add_bullet_points(slide, items, top=Inches(1.8), height=Inches(1.8))

    # mintokuの強み
    add_info_box(slide, "mintokuの既存基盤", [
        "導入企業2,000社以上",
        "外国人採用〜帰国まで一元管理",
        "Mintoku work（求人プラットフォーム）",
        "Mintoku study（日本語学習アプリ）",
        "アジア各国の送り出し機関と連携"
    ], Inches(0.3), Inches(4), Inches(4.5), Inches(3))

    # シナジー
    add_info_box(slide, "新機能によるシナジー", [
        "既存顧客への追加価値提供",
        "採用精度向上による顧客満足度UP",
        "Mintoku studyとの学習連携",
        "採用支援サービスの差別化強化"
    ], Inches(5.2), Inches(4), Inches(4.5), Inches(3))

    # ========== スライド3: 課題提起 ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "企業が抱える外国人採用の課題")

    items = [
        ("日本語能力の正確な見極めが困難", 0),
        ("書類上のJLPTレベル（N1〜N5）だけでは実力がわからない", 1),
        ("面接での会話力と業務遂行能力にギャップがある", 1),
        ("申告JLPTレベルと実力の乖離", 0),
        ("「N2取得」でも実際の会話・敬語が不十分なケースが多い", 1),
        ("ミスマッチによる早期離職", 0),
        ("採用コスト損失（1人あたり平均50〜100万円）", 1),
        ("現場の受け入れ負担増大", 1),
    ]
    add_bullet_points(slide, items, top=Inches(1.5))

    # ========== スライド4: ソリューション概要 ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "ソリューション概要")
    add_subtitle_shape(slide, "AIによる面接練習とわかりやすい評価")

    # 3つの柱
    add_info_box(slide, "① AIアバター面接", [
        "リアルな面接官アバター",
        "リップシンク対応",
        "JLPTレベル別の質問生成",
        "リアルタイム会話"
    ], Inches(0.3), Inches(1.8), Inches(3), Inches(2.8))

    add_info_box(slide, "② AI自動評価", [
        "日本語能力4軸評価",
        "採用適性5軸評価",
        "JLPTレベル乖離検出",
        "業務適性判定"
    ], Inches(3.5), Inches(1.8), Inches(3), Inches(2.8))

    add_info_box(slide, "③ 企業向けレポート", [
        "わかりやすい評価データ",
        "採用判断の根拠提供",
        "比較可能な指標",
        "リスク軽減"
    ], Inches(6.7), Inches(1.8), Inches(3), Inches(2.8))

    # 価値提案
    value_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(5), Inches(9), Inches(1.5))
    set_shape_fill(value_box, 0, 82, 147)
    value_box.line.fill.background()

    value_text = slide.shapes.add_textbox(Inches(0.5), Inches(5.3), Inches(9), Inches(1))
    tf = value_text.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "採用ミスマッチを削減し、企業の採用コストと離職リスクを低減"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)

    # ========== スライド5: 面接シナリオ構成 ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "面接シナリオ構成", font_size=36)

    # タイムラインバー
    timeline_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.5), Inches(2.8), Inches(9), Inches(0.15))
    set_shape_fill(timeline_bar, 200, 200, 200)
    timeline_bar.line.fill.background()

    # 面接フェーズ（シンプル版）
    phases = [
        ("導入", "5分", (100, 150, 200), 0.3),
        ("過去", "10分", (80, 140, 100), 1.8),
        ("現在", "10分", (180, 120, 60), 3.3),
        ("未来", "10分", (140, 80, 140), 4.8),
        ("条件", "5分", (120, 120, 120), 6.3),
        ("締め", "5分", (0, 82, 147), 7.8),
    ]

    for name, time, color, left in phases:
        # 円形のフェーズマーカー
        circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(left + 0.4), Inches(2.55), Inches(0.7), Inches(0.7))
        set_shape_fill(circle, *color)
        circle.line.fill.background()

        # フェーズ名（上）
        name_box = slide.shapes.add_textbox(Inches(left), Inches(1.7), Inches(1.5), Inches(0.8))
        tf = name_box.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = name
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(20)
        p.font.bold = True
        p.font.color.rgb = RgbColor(*color)

        # 時間（円の中）
        time_box = slide.shapes.add_textbox(Inches(left + 0.4), Inches(2.65), Inches(0.7), Inches(0.5))
        tf = time_box.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = time
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = RgbColor(255, 255, 255)

    # 矢印（進行方向）
    for x in [1.55, 3.05, 4.55, 6.05, 7.55]:
        arrow = slide.shapes.add_textbox(Inches(x), Inches(2.65), Inches(0.4), Inches(0.5))
        tf = arrow.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = "▶"
        p.font.size = Pt(16)
        p.font.color.rgb = RgbColor(150, 150, 150)

    # 下部：評価5軸（大きなアイコン風）
    eval_title = slide.shapes.add_textbox(Inches(0.5), Inches(3.8), Inches(9), Inches(0.6))
    tf = eval_title.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "採用適性評価 5軸"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = RgbColor(0, 51, 102)

    axes = [
        ("適応力", (0, 120, 180)),
        ("コミュニケーション", (0, 150, 100)),
        ("主体性", (200, 130, 50)),
        ("定着意向", (150, 80, 150)),
        ("協調性", (100, 100, 180)),
    ]

    for i, (name, color) in enumerate(axes):
        left = 0.5 + i * 1.9
        # 大きな丸
        circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(left), Inches(4.6), Inches(1.7), Inches(1.7))
        set_shape_fill(circle, *color)
        circle.line.fill.background()

        # 軸名
        name_box = slide.shapes.add_textbox(Inches(left), Inches(5.15), Inches(1.7), Inches(0.7))
        tf = name_box.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = name
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = RgbColor(255, 255, 255)

    # 注釈
    note = slide.shapes.add_textbox(Inches(0.5), Inches(6.6), Inches(9), Inches(0.5))
    tf = note.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "各フェーズの回答からAIが5軸を総合評価"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(14)
    p.font.color.rgb = RgbColor(100, 100, 100)

    # ========== スライド6: 面接フロー ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "面接の流れ", font_size=36)

    # 4ステップのフロー
    steps = [
        ("1", "AIが質問", "アバターが\n質問を発話", (0, 82, 147)),
        ("2", "次の質問を確認", "質問内容\nモーダル表示", (100, 100, 100)),
        ("3", "音声で回答", "録音モーダル\nリアルタイム文字起こし", (0, 120, 80)),
        ("4", "次の質問へ", "10問\n繰り返し", (180, 100, 50)),
    ]

    for i, (num, title, desc, color) in enumerate(steps):
        left = 0.4 + i * 2.4

        # 大きな円
        circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(left + 0.35), Inches(1.6), Inches(1.5), Inches(1.5))
        set_shape_fill(circle, *color)
        circle.line.fill.background()

        # 番号
        num_text = slide.shapes.add_textbox(Inches(left + 0.35), Inches(2.0), Inches(1.5), Inches(0.7))
        tf = num_text.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = num
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(36)
        p.font.bold = True
        p.font.color.rgb = RgbColor(255, 255, 255)

        # タイトル
        title_box = slide.shapes.add_textbox(Inches(left), Inches(3.2), Inches(2.2), Inches(0.5))
        tf = title_box.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = title
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = RgbColor(*color)

        # 説明
        desc_box = slide.shapes.add_textbox(Inches(left), Inches(3.7), Inches(2.2), Inches(0.8))
        tf = desc_box.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = desc
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(12)
        p.font.color.rgb = RgbColor(80, 80, 80)

        # 矢印
        if i < 3:
            arrow = slide.shapes.add_textbox(Inches(left + 2.0), Inches(2.1), Inches(0.5), Inches(0.5))
            tf = arrow.text_frame
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = tf.paragraphs[0]
            p.text = "→"
            p.font.size = Pt(28)
            p.font.bold = True
            p.font.color.rgb = RgbColor(180, 180, 180)

    # ========== スライド7: 会話例 ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "会話例", font_size=36)

    # ラベル
    ai_label = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.3), Inches(1.3), Inches(1.2), Inches(0.6))
    set_shape_fill(ai_label, 0, 82, 147)
    ai_label.line.fill.background()

    ai_label_text = slide.shapes.add_textbox(Inches(0.3), Inches(1.4), Inches(1.2), Inches(0.4))
    tf = ai_label_text.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "AI面接官"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)

    user_label = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(8.5), Inches(1.3), Inches(1.2), Inches(0.6))
    set_shape_fill(user_label, 0, 120, 80)
    user_label.line.fill.background()

    user_label_text = slide.shapes.add_textbox(Inches(8.5), Inches(1.4), Inches(1.2), Inches(0.4))
    tf = user_label_text.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "ユーザー"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)

    # 会話データ
    conversations = [
        ("ai", "日本で働きたいと思った理由を教えてください。"),
        ("user", "日本の技術を学びたいからです。母国でも日本製品は有名で、ずっと憧れていました。"),
        ("ai", "5年後、どのようになっていたいですか？"),
        ("user", "日本語をもっと上手になって、リーダーとして働きたいです。"),
        ("ai", "日本で働くにあたって、不安なことはありますか？"),
        ("user", "日本語がまだ完璧ではないので少し不安ですが、毎日勉強しています。"),
    ]

    y_pos = 2.1
    for speaker, text in conversations:
        if speaker == "ai":
            # AI（左側）
            bubble = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.3), Inches(y_pos), Inches(5.5), Inches(0.5))
            set_shape_fill(bubble, 230, 240, 255)
            bubble.line.color.rgb = RgbColor(0, 82, 147)
            bubble.line.width = Pt(2)

            text_box = slide.shapes.add_textbox(Inches(0.5), Inches(y_pos + 0.08), Inches(5.2), Inches(0.4))
            tf = text_box.text_frame
            tf.word_wrap = True
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = tf.paragraphs[0]
            p.text = text
            p.font.size = Pt(13)
            p.font.color.rgb = RgbColor(0, 51, 102)
        else:
            # ユーザー（右側）- 幅を広げて折り返しを防止
            bubble = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(2.0), Inches(y_pos), Inches(7.7), Inches(0.5))
            set_shape_fill(bubble, 230, 255, 240)
            bubble.line.color.rgb = RgbColor(0, 120, 80)
            bubble.line.width = Pt(2)

            text_box = slide.shapes.add_textbox(Inches(2.2), Inches(y_pos + 0.08), Inches(7.4), Inches(0.4))
            tf = text_box.text_frame
            tf.word_wrap = False
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = tf.paragraphs[0]
            p.text = text
            p.font.size = Pt(13)
            p.font.color.rgb = RgbColor(0, 80, 50)

        y_pos += 0.6

    # 下部：評価イメージ
    eval_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(6.6), Inches(9), Inches(0.7))
    set_shape_fill(eval_box, 255, 250, 240)
    eval_box.line.color.rgb = RgbColor(200, 130, 50)
    eval_box.line.width = Pt(2)

    eval_text = slide.shapes.add_textbox(Inches(0.5), Inches(6.75), Inches(9), Inches(0.4))
    tf = eval_text.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "→ 各回答をAIが自動評価（語彙・文法・内容・敬語）"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = RgbColor(180, 100, 30)

    # ========== スライド8: レベルアップチャレンジ ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "レベルアップチャレンジ", font_size=36)
    add_subtitle_shape(slide, "高得点で上位レベルに挑戦")

    # フロー図の設定
    flow_y = 2.2  # フローの縦位置

    # Step 1: 申告レベル N3
    step1_circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.5), Inches(flow_y), Inches(1.5), Inches(1.5))
    set_shape_fill(step1_circle, 0, 82, 147)  # 青系
    step1_circle.line.fill.background()

    step1_text = slide.shapes.add_textbox(Inches(0.5), Inches(flow_y + 0.3), Inches(1.5), Inches(0.9))
    tf = step1_text.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "N3"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(32)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)
    p = tf.add_paragraph()
    p.text = "申告レベル"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.color.rgb = RgbColor(220, 240, 255)

    # 矢印1: AI面接実施
    arrow1 = slide.shapes.add_textbox(Inches(2.1), Inches(flow_y + 0.45), Inches(1.2), Inches(0.6))
    tf = arrow1.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "▶"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(28)
    p.font.color.rgb = RgbColor(150, 150, 150)

    arrow1_label = slide.shapes.add_textbox(Inches(1.9), Inches(flow_y - 0.4), Inches(1.5), Inches(0.4))
    tf = arrow1_label.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "AI面接実施"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.color.rgb = RgbColor(100, 100, 100)

    # Step 2: N3面接結果
    step2_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(3.0), Inches(flow_y), Inches(1.8), Inches(1.5))
    set_shape_fill(step2_box, 0, 150, 100)  # 緑系
    step2_box.line.fill.background()

    step2_text = slide.shapes.add_textbox(Inches(3.0), Inches(flow_y + 0.2), Inches(1.8), Inches(1.1))
    tf = step2_text.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "N3結果"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)
    p = tf.add_paragraph()
    p.text = "70点"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)
    p = tf.add_paragraph()
    p.text = "★高得点"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.color.rgb = RgbColor(255, 255, 150)

    # 矢印2: チャレンジ解放
    arrow2 = slide.shapes.add_textbox(Inches(4.9), Inches(flow_y + 0.45), Inches(1.2), Inches(0.6))
    tf = arrow2.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "▶"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(28)
    p.font.color.rgb = RgbColor(0, 150, 100)

    arrow2_label = slide.shapes.add_textbox(Inches(4.7), Inches(flow_y - 0.4), Inches(1.6), Inches(0.4))
    tf = arrow2_label.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "チャレンジ解放!"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = RgbColor(0, 150, 100)

    # Step 3: N2チャレンジ
    step3_circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(5.8), Inches(flow_y), Inches(1.5), Inches(1.5))
    set_shape_fill(step3_circle, 200, 130, 50)  # オレンジ系
    step3_circle.line.fill.background()

    step3_text = slide.shapes.add_textbox(Inches(5.8), Inches(flow_y + 0.3), Inches(1.5), Inches(0.9))
    tf = step3_text.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "N2"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(32)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)
    p = tf.add_paragraph()
    p.text = "チャレンジ"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.color.rgb = RgbColor(255, 230, 200)

    # 矢印3: AI面接実施
    arrow3 = slide.shapes.add_textbox(Inches(7.4), Inches(flow_y + 0.45), Inches(1.0), Inches(0.6))
    tf = arrow3.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "▶"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(28)
    p.font.color.rgb = RgbColor(150, 150, 150)

    arrow3_label = slide.shapes.add_textbox(Inches(7.2), Inches(flow_y - 0.4), Inches(1.5), Inches(0.4))
    tf = arrow3_label.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "AI面接実施"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.color.rgb = RgbColor(100, 100, 100)

    # Step 4: N2面接結果
    step4_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.0), Inches(flow_y), Inches(1.5), Inches(1.5))
    set_shape_fill(step4_box, 150, 80, 150)  # 紫系
    step4_box.line.fill.background()

    step4_text = slide.shapes.add_textbox(Inches(8.0), Inches(flow_y + 0.2), Inches(1.5), Inches(1.1))
    tf = step4_text.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "N2結果"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)
    p = tf.add_paragraph()
    p.text = "50点"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)
    p = tf.add_paragraph()
    p.text = "挑戦中"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.color.rgb = RgbColor(230, 200, 230)

    # 下部説明ボックス
    explain_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(4.3), Inches(9), Inches(2.5))
    set_shape_fill(explain_box, 255, 250, 240)  # 薄いオレンジ
    explain_box.line.color.rgb = RgbColor(200, 150, 100)
    explain_box.line.width = Pt(2)

    # 説明タイトル
    explain_title = slide.shapes.add_textbox(Inches(0.6), Inches(4.4), Inches(8.8), Inches(0.5))
    tf = explain_title.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "レベルアップチャレンジの仕組み"
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = RgbColor(150, 100, 50)

    # 説明内容
    explain_content = slide.shapes.add_textbox(Inches(0.6), Inches(4.9), Inches(8.8), Inches(1.8))
    tf = explain_content.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE

    explanations = [
        ("💡 高得点基準:", "申告レベルで70点以上を取得すると、上位レベルへのチャレンジが解放されます", (0, 100, 50)),
        ("💡 実力測定:", "実力を正確に測定し、ユーザーに最適なレベルを特定します", (0, 82, 147)),
        ("💡 採用時の価値:", "上位レベルでも高得点なら、申告以上の実力があることを証明できます", (150, 80, 150)),
    ]

    for i, (label, desc, color) in enumerate(explanations):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = f"{label} {desc}"
        p.font.size = Pt(14)
        p.font.color.rgb = RgbColor(*color)
        p.space_after = Pt(8)

    # ========== スライド9: 主な機能 ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "主な機能（できること）")

    items = [
        ("JLPTレベル別学習プラン（N1〜N5対応）", 0),
        ("各レベルに最適化された質問と評価基準", 1),
        ("AIアバター面接", 0),
        ("リップシンク対応のリアルな面接官", 1),
        ("HeyGen APIによる高品質なアバター映像", 1),
        ("その場でアドバイス", 0),
        ("音声認識による即時文字起こし（Google Speech-to-Text）", 1),
        ("回答ごとの評価とアドバイス", 1),
        ("苦手克服ループ", 0),
        ("AIが弱点を特定し、重点的に反復練習", 1),
        ("パーソナライズされた学習体験", 1),
    ]
    add_bullet_points(slide, items, top=Inches(1.3), height=Inches(6))

    # ========== スライド6: 評価で得られる情報 ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "評価で得られる情報")
    add_subtitle_shape(slide, "3つの視点で評価")

    # 日本語能力評価
    add_info_box(slide, "日本語能力評価（4軸）", [
        "語彙力: 適切な単語選択・語彙の豊富さ",
        "文法: 文法的正確性・複雑な構文の使用",
        "内容: 質問への適切な回答・論理性",
        "敬語: ビジネス敬語の正確な使用"
    ], Inches(0.3), Inches(1.8), Inches(4.5), Inches(2.3))

    # 採用適性評価
    add_info_box(slide, "採用適性評価（5軸）", [
        "適応力: 新環境への順応性",
        "コミュニケーション力: 意思疎通能力",
        "主体性: 自発的行動・問題解決意欲",
        "定着意向: 長期勤続の意思",
        "協調性: チームワーク能力"
    ], Inches(5.2), Inches(1.8), Inches(4.5), Inches(2.3))

    # JLPTレベル乖離検出
    jlpt_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(4.5), Inches(9), Inches(2.3))
    set_shape_fill(jlpt_box, 255, 248, 240)  # 薄いオレンジ
    jlpt_box.line.color.rgb = RgbColor(200, 100, 0)

    jlpt_title = slide.shapes.add_textbox(Inches(0.6), Inches(4.6), Inches(8.8), Inches(0.4))
    tf = jlpt_title.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "JLPTレベル乖離検出"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = RgbColor(150, 70, 0)

    jlpt_content = slide.shapes.add_textbox(Inches(0.6), Inches(5.1), Inches(8.8), Inches(1.5))
    tf = jlpt_content.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "申告レベルと実力の乖離を自動検出"
    p.font.size = Pt(14)
    p = tf.add_paragraph()
    p.text = "例：「申告N3 → 実力N4相当」「申告N2 → 実力N2〜N1相当」"
    p.font.size = Pt(13)
    p.font.color.rgb = RgbColor(100, 100, 100)
    p = tf.add_paragraph()
    p.text = "→ 採用後のミスマッチリスクを事前に把握"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = RgbColor(0, 100, 0)

    # ========== スライド7: 企業向け統合評価レポート ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "企業向け評価レポート")
    add_subtitle_shape(slide, "採用判断に必要なデータをわかりやすく")

    items = [
        ("推定実力レベル", 0),
        ("申告N3 → 実力N2相当 など、実際の能力を推定", 1),
        ("レベル別の回答品質", 0),
        ("N1〜N5各レベルでの質問にどれだけ答えられたか", 1),
        ("どんな仕事ができそうか", 0),
        ("簡単な挨拶・案内ができる", 1),
        ("報告・連絡・相談ができる", 1),
        ("お客様対応・電話対応ができる", 1),
        ("総合評価スコア（0-100点）", 0),
        ("採用判断の参考になる点数", 1),
    ]
    add_bullet_points(slide, items, top=Inches(1.5), height=Inches(5.5))

    # ========== スライド8: 競合優位性 ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "競合優位性・差別化ポイント")

    # 4つの強み
    strengths = [
        ("AIアバター面接", "本物の面接官のような\nリアルな面接体験", 0.3, 1.8),
        ("JLPT全レベル対応", "N1〜N5すべてに対応\n正確なレベル判定", 5.2, 1.8),
        ("5つの視点で評価", "適応力・主体性など\n数値でわかりやすく", 0.3, 4.3),
        ("苦手を見つけて改善", "AIが弱点を見つけ\n繰り返し練習", 5.2, 4.3),
    ]

    for title, desc, left, top in strengths:
        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(4.5), Inches(2))
        set_shape_fill(box, 240, 248, 255)
        box.line.color.rgb = RgbColor(0, 102, 153)

        title_shape = slide.shapes.add_textbox(Inches(left + 0.2), Inches(top + 0.2), Inches(4.1), Inches(0.5))
        tf = title_shape.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(18)
        p.font.bold = True
        p.font.color.rgb = RgbColor(0, 82, 147)

        desc_shape = slide.shapes.add_textbox(Inches(left + 0.2), Inches(top + 0.7), Inches(4.1), Inches(1.2))
        tf = desc_shape.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = desc
        p.font.size = Pt(14)
        p.font.color.rgb = RgbColor(80, 80, 80)

    # ========== スライド9: ビジネスモデル ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "ビジネスモデル")
    add_subtitle_shape(slide, "mintoku採用支援サービスの追加機能として提供")

    # mintoku説明ボックス
    mintoku_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(1.6), Inches(9), Inches(1.4))
    set_shape_fill(mintoku_box, 0, 82, 147)
    mintoku_box.line.fill.background()

    mintoku_text = slide.shapes.add_textbox(Inches(0.6), Inches(1.7), Inches(8.8), Inches(1.2))
    tf = mintoku_text.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "mintoku採用支援サービスの高付加価値オプションとして展開"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)
    p = tf.add_paragraph()
    p.text = "導入企業2,000社以上の既存顧客基盤を活用"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(14)
    p.font.color.rgb = RgbColor(220, 240, 255)
    p = tf.add_paragraph()
    p.text = "Mintoku study（日本語学習アプリ）との連携で学習→評価の一貫サービス"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(14)
    p.font.color.rgb = RgbColor(220, 240, 255)

    # 提供形態
    add_info_box(slide, "提供形態", [
        "採用支援サービス契約企業向けオプション",
        "Mintoku work求職者向け面接練習機能",
        "人材紹介時の評価レポート付加価値",
        "登録支援機関向けツール提供"
    ], Inches(0.3), Inches(3.3), Inches(4.5), Inches(2.2))

    # 収益モデル
    add_info_box(slide, "収益モデル", [
        "AI面接回数ベースの従量課金",
        "企業向け評価レポート（1件単位）",
        "月額プレミアムプラン",
        "エンタープライズ（無制限利用）"
    ], Inches(5.2), Inches(3.3), Inches(4.5), Inches(2.2))

    # コスト構造
    cost_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(5.7), Inches(9), Inches(1.6))
    set_shape_fill(cost_box, 250, 250, 250)
    cost_box.line.color.rgb = RgbColor(150, 150, 150)

    cost_title = slide.shapes.add_textbox(Inches(0.6), Inches(5.8), Inches(8.8), Inches(0.4))
    tf = cost_title.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "主要コスト構造（外部API）"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = RgbColor(80, 80, 80)

    cost_content = slide.shapes.add_textbox(Inches(0.6), Inches(6.2), Inches(8.8), Inches(1))
    tf = cost_content.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "HeyGen API（アバター） / Google STT（音声認識） / OpenAI API（評価・質問生成）"
    p.font.size = Pt(12)
    p.font.color.rgb = RgbColor(80, 80, 80)

    # ========== スライド10: 開発工数 ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "開発工数")
    add_subtitle_shape(slide, "4フェーズ構成による段階的開発")

    # サマリーボックス
    summary_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(1.6), Inches(9), Inches(1.2))
    set_shape_fill(summary_box, 0, 82, 147)
    summary_box.line.fill.background()

    summary_text = slide.shapes.add_textbox(Inches(0.6), Inches(1.75), Inches(8.8), Inches(1))
    tf = summary_text.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "総開発期間: 14週間（約3.5ヶ月）  |  総工数: 約11.5人月（230人日）"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)
    p = tf.add_paragraph()
    p.text = "推奨体制: 4名（PM/PL、バックエンド、フロントエンド、QA）"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(14)
    p.font.color.rgb = RgbColor(220, 240, 255)

    # フェーズ別ボックス
    phases = [
        ("Phase 1", "基盤構築", "4週間", "認証基盤・API・\nユーザー向け画面", 0.3, 3.1),
        ("Phase 2", "アバター統合", "4週間", "HeyGen・音声認識・\n面接フロー制御", 5.2, 3.1),
        ("Phase 3", "評価機能", "3週間", "GPT-4o評価・苦手分析・\nmintoku連携・管理画面", 0.3, 5.0),
        ("Phase 4", "リリース準備", "3週間", "セキュリティ・負荷テスト・\n本番環境構築", 5.2, 5.0),
    ]

    for phase_num, phase_name, duration, desc, left, top in phases:
        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(4.5), Inches(1.7))
        set_shape_fill(box, 240, 248, 255)
        box.line.color.rgb = RgbColor(0, 102, 153)

        # フェーズ番号と名前
        phase_title = slide.shapes.add_textbox(Inches(left + 0.15), Inches(top + 0.1), Inches(4.2), Inches(0.4))
        tf = phase_title.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = f"{phase_num}: {phase_name}（{duration}）"
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = RgbColor(0, 82, 147)

        # 説明
        phase_desc = slide.shapes.add_textbox(Inches(left + 0.15), Inches(top + 0.5), Inches(4.2), Inches(1.1))
        tf = phase_desc.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = desc
        p.font.size = Pt(12)
        p.font.color.rgb = RgbColor(80, 80, 80)

    # ========== スライド11: ガントチャート ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "開発スケジュール", font_size=36)

    # 週ラベル用の設定
    chart_left = 2.0  # チャート開始位置
    chart_width = 7.5  # チャート幅
    week_width = chart_width / 14  # 1週間あたりの幅
    bar_height = 0.6  # バーの高さ
    bar_gap = 0.3  # バー間の隙間

    # 週番号ヘッダー
    for week in range(1, 15):
        week_label = slide.shapes.add_textbox(
            Inches(chart_left + (week - 1) * week_width),
            Inches(1.4),
            Inches(week_width),
            Inches(0.4)
        )
        tf = week_label.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = str(week)
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(10)
        p.font.color.rgb = RgbColor(100, 100, 100)

    # 週区切り線（縦線）
    for week in range(0, 15):
        line = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE,
            Inches(chart_left + week * week_width),
            Inches(1.8),
            Inches(0.01),
            Inches(4.5)
        )
        set_shape_fill(line, 220, 220, 220)
        line.line.fill.background()

    # フェーズ名ラベル用の幅
    label_width = 1.8

    # フェーズデータ: (名前, 開始週, 期間週, 色)
    gantt_phases = [
        ("Phase 1\n基盤構築", 1, 4, (0, 120, 180)),
        ("Phase 2\nアバター統合", 5, 4, (0, 150, 100)),
        ("Phase 3\n評価機能", 9, 3, (200, 130, 50)),
        ("Phase 4\nリリース準備", 12, 3, (150, 80, 150)),
    ]

    for i, (name, start_week, duration, color) in enumerate(gantt_phases):
        y_pos = 2.0 + i * (bar_height + bar_gap)

        # フェーズ名ラベル（左側）
        label = slide.shapes.add_textbox(
            Inches(0.2),
            Inches(y_pos),
            Inches(label_width),
            Inches(bar_height)
        )
        tf = label.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = name
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = RgbColor(*color)

        # ガントバー
        bar_left = chart_left + (start_week - 1) * week_width
        bar_width_val = duration * week_width
        bar = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(bar_left),
            Inches(y_pos),
            Inches(bar_width_val),
            Inches(bar_height)
        )
        set_shape_fill(bar, *color)
        bar.line.fill.background()

        # バー内の期間テキスト
        bar_text = slide.shapes.add_textbox(
            Inches(bar_left),
            Inches(y_pos),
            Inches(bar_width_val),
            Inches(bar_height)
        )
        tf = bar_text.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = f"{duration}週間"
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = RgbColor(255, 255, 255)

    # 月ラベル（下部）
    month_labels = [
        ("1ヶ月目", 0, 4),
        ("2ヶ月目", 4, 4),
        ("3ヶ月目", 8, 4),
        ("3.5ヶ月目", 12, 2),
    ]

    for label_text, start_week, weeks in month_labels:
        month_box = slide.shapes.add_textbox(
            Inches(chart_left + start_week * week_width),
            Inches(5.8),
            Inches(weeks * week_width),
            Inches(0.4)
        )
        tf = month_box.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = label_text
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(11)
        p.font.color.rgb = RgbColor(80, 80, 80)

    # 凡例（下部）
    legend_y = 6.4
    legend_items = [
        ("基盤構築", (0, 120, 180)),
        ("アバター統合", (0, 150, 100)),
        ("評価機能", (200, 130, 50)),
        ("リリース準備", (150, 80, 150)),
    ]

    for i, (legend_text, color) in enumerate(legend_items):
        x_pos = 0.5 + i * 2.4

        # 凡例の色ボックス
        legend_box = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(x_pos),
            Inches(legend_y + 0.1),
            Inches(0.3),
            Inches(0.3)
        )
        set_shape_fill(legend_box, *color)
        legend_box.line.fill.background()

        # 凡例テキスト
        legend_label = slide.shapes.add_textbox(
            Inches(x_pos + 0.4),
            Inches(legend_y),
            Inches(1.8),
            Inches(0.5)
        )
        tf = legend_label.text_frame
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.text = legend_text
        p.font.size = Pt(11)
        p.font.color.rgb = RgbColor(60, 60, 60)

    # 総期間の注釈
    total_note = slide.shapes.add_textbox(Inches(0.5), Inches(7), Inches(9), Inches(0.4))
    tf = total_note.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "総開発期間: 14週間（約3.5ヶ月）"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = RgbColor(0, 82, 147)

    # ========== スライド12: 開発規模 ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "開発規模")
    add_subtitle_shape(slide, "システム構成の概要")

    # 開発規模ボックス
    add_info_box(slide, "画面数", [
        "ユーザー向け: 5画面",
        "（ログイン、ホーム、面接練習、",
        "  フィードバック、学習進捗）",
        "管理者向け: 5画面",
        "合計: 10画面"
    ], Inches(0.3), Inches(1.6), Inches(3), Inches(2.8))

    add_info_box(slide, "APIエンドポイント", [
        "認証API: 3",
        "面接セッションAPI: 5",
        "評価API: 2",
        "質問API: 2",
        "管理者向けAPI: 5",
        "合計: 19エンドポイント"
    ], Inches(3.5), Inches(1.6), Inches(3), Inches(2.8))

    add_info_box(slide, "外部サービス連携", [
        "HeyGen Streaming Avatar",
        "（アバター表示・発話）",
        "Google Cloud STT",
        "（音声認識・文字起こし）",
        "mintoku work",
        "（SSO認証・結果送信）"
    ], Inches(6.7), Inches(1.6), Inches(3), Inches(2.8))

    # 役割別工数
    role_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(4.7), Inches(9), Inches(2.5))
    set_shape_fill(role_box, 250, 250, 250)
    role_box.line.color.rgb = RgbColor(150, 150, 150)

    role_title = slide.shapes.add_textbox(Inches(0.6), Inches(4.8), Inches(8.8), Inches(0.4))
    tf = role_title.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "役割別工数サマリー"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = RgbColor(80, 80, 80)

    role_content = slide.shapes.add_textbox(Inches(0.6), Inches(5.3), Inches(8.8), Inches(1.8))
    tf = role_content.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    roles = [
        "• フロントエンドエンジニア: 84人日（HeyGen統合・UI実装）",
        "• バックエンドエンジニア: 73人日（API・評価ロジック・外部連携）",
        "• QA/テストエンジニア: 65人日（テスト設計・実行・セキュリティ）",
        "• インフラエンジニア: 32人日（AWS構築・CI/CD）",
        "• PM/PL: 24人日（プロジェクト管理・ドキュメント）"
    ]
    for i, role in enumerate(roles):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = role
        p.font.size = Pt(12)
        p.font.color.rgb = RgbColor(60, 60, 60)

    # ========== スライド12: ランニングコスト ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "ランニングコスト")
    add_subtitle_shape(slide, "AI面接回数ベースの従量課金モデル")

    # コストサマリー
    summary_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(1.6), Inches(9), Inches(1.8))
    set_shape_fill(summary_box, 240, 248, 255)
    summary_box.line.color.rgb = RgbColor(0, 102, 153)

    summary_title = slide.shapes.add_textbox(Inches(0.6), Inches(1.7), Inches(8.8), Inches(0.4))
    tf = summary_title.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "月額コスト試算（1回の面接 = 10分として計算）"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = RgbColor(0, 82, 147)

    summary_content = slide.shapes.add_textbox(Inches(0.6), Inches(2.1), Inches(8.8), Inches(1.2))
    tf = summary_content.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "Proプラン（50回/月）: 約43,000円/月  |  Scaleプラン（330回/月）: 約83,000円/月"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = RgbColor(51, 51, 51)
    p = tf.add_paragraph()
    p.text = "※ AWSインフラ（27,000円）+ 外部API（HeyGen / Google STT / OpenAI GPT-4o）"
    p.font.size = Pt(12)
    p.font.color.rgb = RgbColor(100, 100, 100)

    # コスト内訳ボックス
    add_info_box(slide, "Proプラン（50回/月）", [
        "HeyGen: 14,850円",
        "Google Cloud STT: 900円",
        "OpenAI GPT-4o: 113円",
        "AWSインフラ: 27,000円",
        "合計: 約43,000円/月"
    ], Inches(0.3), Inches(3.6), Inches(3), Inches(2.3))

    add_info_box(slide, "Scaleプラン（330回/月）", [
        "HeyGen: 49,500円",
        "Google Cloud STT: 5,940円",
        "OpenAI GPT-4o: 743円",
        "AWSインフラ: 27,000円",
        "合計: 約83,000円/月"
    ], Inches(3.5), Inches(3.6), Inches(3), Inches(2.3))

    # Enterpriseプラン
    enterprise_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.7), Inches(3.6), Inches(3), Inches(2.3))
    set_shape_fill(enterprise_box, 255, 240, 240)
    enterprise_box.line.color.rgb = RgbColor(200, 80, 80)

    ent_title = slide.shapes.add_textbox(Inches(6.8), Inches(3.7), Inches(2.8), Inches(0.4))
    tf = ent_title.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "Enterprise（331回以上/月）"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = RgbColor(180, 50, 50)

    ent_content = slide.shapes.add_textbox(Inches(6.8), Inches(4.15), Inches(2.8), Inches(1.6))
    tf = ent_content.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "• HeyGen: 個別交渉"
    p.font.size = Pt(11)
    p.font.color.rgb = RgbColor(80, 80, 80)
    p = tf.add_paragraph()
    p.text = "• STT/GPT: 従量課金"
    p.font.size = Pt(11)
    p.font.color.rgb = RgbColor(80, 80, 80)
    p = tf.add_paragraph()
    p.text = "• AWS: スケールアップ"
    p.font.size = Pt(11)
    p.font.color.rgb = RgbColor(80, 80, 80)
    p = tf.add_paragraph()
    p.text = ""
    p = tf.add_paragraph()
    p.text = "※ 要個別見積"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = RgbColor(180, 50, 50)

    # 注記
    note_text = slide.shapes.add_textbox(Inches(0.5), Inches(6.1), Inches(9), Inches(1))
    tf = note_text.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "※ 為替: $1 = 150円で計算"
    p.font.size = Pt(11)
    p.font.color.rgb = RgbColor(120, 120, 120)
    p = tf.add_paragraph()
    p.text = "※ Scale（330回/月）を超える利用にはEnterpriseプラン（HeyGen個別交渉）が必要"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = RgbColor(180, 50, 50)

    # ========== スライド13: 年間コスト ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_header_line(slide)
    add_title_shape(slide, "年間コスト試算", font_size=36)

    # Proプラン
    pro_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(1.8), Inches(4.3), Inches(3))
    set_shape_fill(pro_box, 240, 248, 255)
    pro_box.line.color.rgb = RgbColor(0, 82, 147)
    pro_box.line.width = Pt(2)

    pro_title = slide.shapes.add_textbox(Inches(0.5), Inches(2), Inches(4.3), Inches(0.6))
    tf = pro_title.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "Proプラン"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = RgbColor(0, 82, 147)

    pro_count = slide.shapes.add_textbox(Inches(0.5), Inches(2.6), Inches(4.3), Inches(0.5))
    tf = pro_count.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "600回/年"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(18)
    p.font.color.rgb = RgbColor(100, 100, 100)

    pro_price = slide.shapes.add_textbox(Inches(0.5), Inches(3.3), Inches(4.3), Inches(0.8))
    tf = pro_price.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "約51万円/年"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(32)
    p.font.bold = True
    p.font.color.rgb = RgbColor(0, 82, 147)

    # Scaleプラン
    scale_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.2), Inches(1.8), Inches(4.3), Inches(3))
    set_shape_fill(scale_box, 0, 82, 147)
    scale_box.line.fill.background()

    scale_title = slide.shapes.add_textbox(Inches(5.2), Inches(2), Inches(4.3), Inches(0.6))
    tf = scale_title.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "Scaleプラン"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)

    scale_count = slide.shapes.add_textbox(Inches(5.2), Inches(2.6), Inches(4.3), Inches(0.5))
    tf = scale_count.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "3,960回/年"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(18)
    p.font.color.rgb = RgbColor(200, 220, 255)

    scale_price = slide.shapes.add_textbox(Inches(5.2), Inches(3.3), Inches(4.3), Inches(0.8))
    tf = scale_price.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "約100万円/年"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(32)
    p.font.bold = True
    p.font.color.rgb = RgbColor(255, 255, 255)

    # Enterprise
    ent_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.5), Inches(5.1), Inches(9), Inches(1.2))
    set_shape_fill(ent_box, 255, 245, 245)
    ent_box.line.color.rgb = RgbColor(180, 80, 80)
    ent_box.line.width = Pt(2)

    ent_text = slide.shapes.add_textbox(Inches(0.5), Inches(5.4), Inches(9), Inches(0.8))
    tf = ent_text.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "Enterprise（3,960回/年 以上）: 個別見積"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = RgbColor(180, 80, 80)

    # 注記
    note = slide.shapes.add_textbox(Inches(0.5), Inches(6.6), Inches(9), Inches(0.5))
    tf = note.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "※ 為替: $1 = 150円で計算 | 外部APIはUSD建て（為替変動あり）"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.color.rgb = RgbColor(120, 120, 120)

    # ========== スライド14: お問い合わせ ==========
    slide = prs.slides.add_slide(prs.slide_layouts[6])

    # 背景
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(10), Inches(7.5))
    set_shape_fill(bg, 0, 82, 147)
    bg.line.fill.background()

    # タイトル
    add_centered_text(slide, "お問い合わせ / Next Steps", Inches(1.5), 36, True, (255, 255, 255))

    # デモ案内
    demo_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(2), Inches(3), Inches(6), Inches(2))
    set_shape_fill(demo_box, 255, 255, 255)
    demo_box.line.fill.background()

    demo_text = slide.shapes.add_textbox(Inches(2), Inches(3.3), Inches(6), Inches(0.5))
    tf = demo_text.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "デモンストレーションのご案内"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = RgbColor(0, 82, 147)

    demo_desc = slide.shapes.add_textbox(Inches(2), Inches(4), Inches(6), Inches(0.8))
    tf = demo_desc.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.text = "実際のAI面接体験と評価レポートの\nデモをご覧いただけます"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(14)
    p.font.color.rgb = RgbColor(100, 100, 100)

    # Confidential
    add_centered_text(slide, "Confidential", Inches(6.5), 12, False, (180, 200, 220))

    return prs


def main():
    """メイン処理"""
    prs = create_presentation()
    output_path = "/Users/yoshidaseiichi/yoshidasendai/ai-interview/docs/プレゼン資料/AI面接プラットフォーム_投資家向け.pptx"
    prs.save(output_path)
    print(f"プレゼンテーションを作成しました: {output_path}")


if __name__ == "__main__":
    main()
