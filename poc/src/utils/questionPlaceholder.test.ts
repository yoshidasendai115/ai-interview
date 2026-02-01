import { describe, it, expect, vi } from "vitest";
import {
  INDUSTRY_PREFECTURES,
  selectRandomPrefecture,
  replacePlaceholder,
  replacePlaceholders
} from "./questionPlaceholder";

describe("questionPlaceholder", () => {
  describe("INDUSTRY_PREFECTURES", () => {
    it("全7業界が定義されている", () => {
      const industries = Object.keys(INDUSTRY_PREFECTURES);
      expect(industries).toHaveLength(7);
      expect(industries).toContain("nursing_care");
      expect(industries).toContain("food_service");
      expect(industries).toContain("construction");
      expect(industries).toContain("manufacturing");
      expect(industries).toContain("hospitality");
      expect(industries).toContain("agriculture");
      expect(industries).toContain("building_cleaning");
    });

    it("各業界に3つの都道府県が定義されている", () => {
      Object.values(INDUSTRY_PREFECTURES).forEach(industry => {
        expect(industry.prefectures).toHaveLength(3);
        expect(industry.name).toBeTruthy();
        expect(industry.reason).toBeTruthy();
      });
    });

    it("製造業は愛知県が1位", () => {
      expect(INDUSTRY_PREFECTURES.manufacturing.prefectures[0]).toBe("愛知県");
    });

    it("農業には茨城県が含まれる", () => {
      expect(INDUSTRY_PREFECTURES.agriculture.prefectures).toContain("茨城県");
    });

    it("宿泊業には京都府が含まれる", () => {
      expect(INDUSTRY_PREFECTURES.hospitality.prefectures).toContain("京都府");
    });
  });

  describe("selectRandomPrefecture", () => {
    it("有効な業界IDで都道府県を返す", () => {
      const prefecture = selectRandomPrefecture("nursing_care");
      expect(INDUSTRY_PREFECTURES.nursing_care.prefectures).toContain(prefecture);
    });

    it("製造業で有効な都道府県を返す", () => {
      const prefecture = selectRandomPrefecture("manufacturing");
      expect(["愛知県", "静岡県", "大阪府"]).toContain(prefecture);
    });

    it("無効な業界IDでデフォルト都道府県を返す", () => {
      const prefecture = selectRandomPrefecture("invalid_industry");
      expect(["東京都", "大阪府", "愛知県"]).toContain(prefecture);
    });

    it("ランダム性がある（複数回実行で異なる結果が出る可能性）", () => {
      const results = new Set<string>();
      // 100回実行して複数の結果が出ることを確認
      for (let i = 0; i < 100; i++) {
        results.add(selectRandomPrefecture("nursing_care"));
      }
      // 3つの選択肢があるので、100回実行すれば複数出るはず
      expect(results.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe("replacePlaceholder", () => {
    it("〇〇を都道府県名に置換する", async () => {
      const result = await replacePlaceholder(
        "勤務地は〇〇ですが、通勤は大丈夫ですか？",
        "nursing_care",
        false
      );
      expect(result).not.toContain("〇〇");
      expect(
        result.includes("東京都") ||
        result.includes("神奈川県") ||
        result.includes("愛知県")
      ).toBe(true);
    });

    it("プレースホルダーがない場合はそのまま返す", async () => {
      const original = "いつから働けますか？";
      const result = await replacePlaceholder(original, "nursing_care", false);
      expect(result).toBe(original);
    });

    it("複数の〇〇を同じ都道府県に置換する", async () => {
      const result = await replacePlaceholder(
        "〇〇で働きます。〇〇は好きですか？",
        "manufacturing",
        false
      );
      // 両方とも同じ都道府県に置換されているか確認
      const matches = result.match(/(愛知県|静岡県|大阪府)/g);
      expect(matches).toHaveLength(2);
      expect(matches![0]).toBe(matches![1]);
    });
  });

  describe("replacePlaceholders", () => {
    it("複数の質問を一括置換する", async () => {
      const questions = [
        "勤務地は〇〇ですが、通勤は大丈夫ですか？",
        "〇〇での生活について教えてください",
        "いつから働けますか？"
      ];
      const results = await replacePlaceholders(questions, "hospitality", false);

      expect(results).toHaveLength(3);
      expect(results[0]).not.toContain("〇〇");
      expect(results[1]).not.toContain("〇〇");
      expect(results[2]).toBe("いつから働けますか？");

      // 同じ都道府県が使用されていることを確認
      const prefectures = ["東京都", "大阪府", "京都府"];
      const usedPrefecture = prefectures.find(p => results[0].includes(p));
      expect(usedPrefecture).toBeTruthy();
      expect(results[1]).toContain(usedPrefecture!);
    });
  });
});
