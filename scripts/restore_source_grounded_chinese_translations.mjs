import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..\\", import.meta.url)));
const legacy = "C:\\Users\\yuanj\\Downloads\\cornell-law-2026-27.zh-CN.json";
if (!existsSync(legacy)) throw new Error(`Missing translation source: ${legacy}`);
const manual = {
  "LAW 5311":"本课程旨在介绍新企业融资中的挑战与常见风险。课堂将结合讲授与案例，涵盖三个主题：识别和评估商业机会、合同设计与融资替代方案，以及退出与收益实现策略。",
  "LAW 6029":"本课程面向希望进一步了解调解、恢复性实践及替代性争议解决（ADR）程序与体系的学生，先修课程为 Campus Mediation Practicum I。学生将在该课程基础上，理解调解与恢复性司法在不同场景中促进 ADR 的作用；并将指导 CMP I 学生调解员、调解由学生行为与社区标准办公室、汤普金斯县社区争议解决中心、伊萨卡市小额索赔法院及蒙大拿调解项目转介的复杂案件。学生亦有机会与经验丰富的调解员交流。",
  "LAW 6304":"本课程帮助学生理解快速变革中的法律服务环境，并具备以洞见与实务技能参与其演进的能力。课程包括两部分：（1）法律科技生态：通过创业者、投资人和使用者的视角，以及对新工具和解决方案的讨论，了解法律科技趋势和创新；（2）法律科技设计：探索如何将法律流程与工作流转化为自动化方案，并使用无代码或 vibecoding 工具开发法律领域应用。课程以学生团队向评审团展示设计方案的友好竞赛收尾。",
  "LAW 6334":"谈判是工作、人际关系和生活的重要部分，但人们常回避艰难对话，也往往不擅长谈判。科技使交易更复杂，但谈判的基本原则并未改变。完成本课程后，学生将理解成功谈判的基础原则，并在濒临破裂的知识产权交易背景下处理知识产权、合同权利、价值和救济等问题；学生将学习以有助于实现最佳谈判结果的方式处理大小谈判，并培养在职业和个人生活中均有价值的技能。",
  "LAW 6897":"本课程帮助学生理解律所的组织结构、运营、关键财务指标、技术，以及用于优化律所表现的商业与人力资本策略。除介绍影响业务运营和组织结构的决策外，课程还将讨论律所如何适应或未能适应技术变化，以及这些变化如何影响律师助理和合伙人的职业与生活。",
  "LAW 7458":"本研讨课考察联邦上诉法院法官为何撰写协同意见或反对意见，以及希望借此实现什么目标。阅读材料将把这种写作实践置于有关联邦上诉法院角色和司法独立性质的更广泛讨论中。课程将分析决定单独写作的成本收益，包括案件负荷压力、巡回法院分歧、社交媒体放大、针对个别法官的威胁及公众信任下降等当代问题。每位学生将根据真实联邦上诉记录起草一份协同意见和一份反对意见，对两份草稿进行引导式同伴评审，并与教师单独讨论后实质性修改其中一份意见。",
  "LAW 7587":"股东积极主义：传统行动以及环境、社会与公司治理议题。当前官方课程说明未提供进一步文字介绍。",
  "LAW 7694":"在美国，宪法论证常是解决公权力争议的默认框架；但美国也自称为法治体制。这一承诺除宪法文本与结构外意味着什么？是否具有独立的教义或规范力量？本密集六次研讨课将法治视为塑造并约束行政权力的一组原则，而非口号。课程结合经典与当代理论，以及其他法域的比较材料，讨论合法性、一般性和裁量与法律约束之间的关系；并将包括 Trump v. United States 和 Learning Resources, Inc. v. Trump 在内的当代美国判例与这些理论讨论相联系，以重新审视熟悉的教义与公共权威基础。",
  "LAW 7810":"学生将在课堂讲授、阅读材料以及代理客户的过程中学习庇护、禁止酷刑公约和移民法。多数学生将代理客户向移民上诉委员会提出上诉；诊所亦不时受理联邦复审申请和庇护官案件。学生还将学习高级法律写作技巧，包括上诉策略、有说服力的叙事、专家报告的运用，以及在复杂法律框架中进行有效论证。",
  "LAW 7855":"在本诊所课程中，学生将参与使其接触多种人权倡导形式的项目。诊所以诉讼为导向，但学生也可能接触立法倡导，并有机会就海外人权侵害开展事实调查和研究。项目示例包括：（1）为马拉维被剥夺律师权利的在押人员进行上诉倡导，并与当地律师合作减轻监狱拥挤、保护审前被拘留者权利；（2）代理一名曾遭美国审讯人员酷刑的关塔那摩在押人员；以及（3）与世界各地律师合作推进有关死刑适用的国际规范落实。"
};
const source = JSON.parse(await readFile(legacy, "utf8"));
const sourceByCode = new Map((source.courses || []).map(course => [course.code, course]));
for (const relative of ["data/cornell-law-2026-27.zh-CN.json", "data/cornell-law-2026-27.en.json"]) {
  const filename = resolve(root, relative);
  const dataset = JSON.parse(await readFile(filename, "utf8"));
  for (const course of dataset.courses) {
    const prior = sourceByCode.get(course.code);
    const translation = manual[course.code] || prior?.descriptionZh || "";
    if (translation) {
      course.descriptionZh = translation;
      course.translationStatus = "source-grounded-chinese-translation";
      course.translationMethod = manual[course.code] ? "Chinese translation prepared directly from the current official English description." : "Chinese translation restored from the previously delivered source-grounded Cornell course dataset; current official English original is retained.";
    }
  }
  await writeFile(filename, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify({ restoredFromPriorDataset:sourceByCode.size, manualCurrentTranslations:Object.keys(manual).length }, null, 2));
