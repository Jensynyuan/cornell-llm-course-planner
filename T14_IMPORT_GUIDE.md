# T14 课程包导入：首次使用操作清单

本功能不假定每所学校有公开 API，也不会尝试绕过登录、权限或验证码。它用一个保守的离线闭环完成导入：官方页面材料 → 任意 AI 整理 → ZIP 压缩包 → 本机验证、导入与切换学校。

## 所有学校通用的五步

1. 在“学校与数据”选择学校，点击“官方课程源”。选择正确的学年和学期。
2. 在官方页面显示全部课程后，任选一种稳定方式保存材料：浏览器“打印为 PDF”、保存网页、复制页面源代码，或下载学校提供的 CSV/JSON。不要只截取一页结果。
3. 点击“下载本校操作清单”和“复制提示词”。把清单、提示词和上述官方材料一并交给你可以使用的 AI。
4. 让 AI 返回无密码 `course-import-package.zip`；ZIP 内至少有 `llm-course-package.json`，并最好附 `import-report.txt`。
5. 回到本软件，选择“上传智能助手返回的压缩包（推荐）”，先读取预览。软件会报告可导入、跳过、缺少中文字段和未公布时间的数量。确认后保存，软件自动切换至该校。

## 学校入口和材料取得方式

| 学校 | 官方入口 | 优先取得的材料 |
|---|---|---|
| Cornell Law School | Class Roster | 选择学期后保存 LAW 全部结果页面或官方下载/API JSON；登录后才能看到的地点留空。 |
| Yale Law School | Yale Law course system | 选择学期后的完整课程结果页或页面打印件。 |
| Stanford Law School | ExploreCourses / Stanford Law courses | ExploreCourses 的选学期结果页或导出；不假定公开 JSON API。 |
| Harvard Law School | HLS Courses | 课程页完整结果、学校允许的下载文件；API Key 仅在你已获授权时使用。 |
| Chicago, Columbia, NYU | 各校 Course Catalog / Course Schedule | 课程目录和当学期时间表应尽量一并保存；目录没有时间时也可导入。 |
| Penn Carey, UVA, Duke | Course Finder / Course Browser | 保存整个学期的检索结果和可见班次页面。 |
| Michigan, Berkeley, Northwestern, Georgetown | 官方 Course Catalog / Schedule | 保存课程目录和实际开课页面；如二者分开，均附给 AI。 |

学校链接由软件卡片维护；页面地址可能按学年变动，以卡片中的官方链接为准。

## AI 必须输出的最小数据

每一门可识别课程至少要有 `code` 和 `titleEn` 或 `titleZh`。缺少中文、时间、地点、教师或学分不会自动丢弃这门课程；软件会保留官方英文并提示缺口。缺少课程代号或课程名称的记录会被跳过并列入结果报告。

对于 lecture + discussion：AI 需要将 lecture 标为 `selectionGroup: "lecture"`，discussion 标为 `selectionGroup: "discussion"`。软件会强制选择一节 lecture，并只允许选择一节 discussion。

## 不应导入的课程

不得将官方明确写明 `undergraduates only`、`enrollment limited to undergraduates` 或明确不计入 LL.M./JD 学位的课程作为正常 LL.M. 选课课程导入。若要保留供旁听查询，可由 AI 放入 `excluded-courses.json`，不放进 `courses`。

## 导入结果如何处理

- “可导入”：已保存并自动切换到对应法学院。
- “跳过”：复制结果中的课程代号和原因，交回 AI 补充或修正后重新上传。
- “缺少中文字段”：不影响导入；英文官方标题和说明将正常显示。
- “未公布上课时间”：不进入周课表，但仍可搜索、阅读和日后编辑。

每所学校的数据仅存于当前设备浏览器；重新导入同一学校会更新该校本地快照，不会覆盖其他学校。
