#!/bin/bash
cd "/Users/yoshidaseiichi/yoshidasendai/ai-interview/docs/基本設計書"

OPTS='{"margin":"10mm"}'

# pdfフォルダ作成
mkdir -p pdf

md-to-pdf --pdf-options "$OPTS" "00_目次.md" && mv "00_目次.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "01_プロジェクト概要.md" && mv "01_プロジェクト概要.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "02_システム概要.md" && mv "02_システム概要.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "03_技術スタック.md" && mv "03_技術スタック.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "04_AWSインフラ構成.md" && mv "04_AWSインフラ構成.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "05_プロジェクト構成.md" && mv "05_プロジェクト構成.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "06_画面設計.md" && mv "06_画面設計.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "07_評価ロジック.md" && mv "07_評価ロジック.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "08_開発ロードマップ.md" && mv "08_開発ロードマップ.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "09_外部API連携.md" && mv "09_外部API連携.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "10_API仕様.md" && mv "10_API仕様.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "11_データベーススキーマ.md" && mv "11_データベーススキーマ.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "12_面接フロー制御.md" && mv "12_面接フロー制御.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "13_面接シナリオ設計.md" && mv "13_面接シナリオ設計.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "14_セキュリティ設計.md" && mv "14_セキュリティ設計.pdf" pdf/
md-to-pdf --pdf-options "$OPTS" "15_監視設計.md" && mv "15_監視設計.pdf" pdf/

echo "PDF変換完了 → pdf/ フォルダに出力"
