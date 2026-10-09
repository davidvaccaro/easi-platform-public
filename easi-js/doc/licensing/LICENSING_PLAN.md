# EASI JS community and commercial licensing plan

Use a free community license for individuals, qualifying research and nonprofit institutions, and businesses below **USD 5 million in annual consolidated gross revenue**. Other organizations need a commercial license. The copyright owner is **Xinonix Interactive Development, Inc.** These choices were confirmed by the project owner on October 9, 2026.

The proposed [community license](EASI-JS-COMMUNITY-LICENSE-DRAFT.txt) and [commercial agreement](EASI-JS-COMMERCIAL-LICENSE-DRAFT.txt) implement that model. They are original draft terms for review, not executed grants or copies of another project's license. Revenue eligibility is a licensing condition; no runtime key, activation call, telemetry, or watermark is proposed.

## Describe the model accurately

The appropriate label is **source-available with free community and paid commercial licensing**. A revenue restriction does not meet the [OSI Open Source Definition](https://opensource.org/osd), which requires use without discrimination against persons, groups, or fields of endeavor. Do not advertise this custom license as OSI-approved open source or label it MIT, Apache-2.0, or AGPL.

If OSI open-source status later becomes essential, an AGPL/commercial dual model is an alternative, provided the necessary ownership/contributor rights exist. It cannot guarantee that every large company pays: a company can use the AGPL version if it fulfills the applicable obligations. The [GNU explanation of AGPL](https://www.gnu.org/licenses/why-affero-gpl.en.html) describes its network source-availability requirement for modified programs. It is not a revenue tax.

## Why choose five million dollars

There is no universal revenue cutoff for free commercial use. [PolyForm Small Business 1.0.0](https://polyformproject.org/licenses/small-business/1.0.0) uses an inflation-adjusted USD 1 million baseline from 2019 and fewer than 100 employees/contractors. [QuestPDF](https://www.questpdf.com/license/configuration.html) uses USD 1 million and also provides exceptions for individuals and nonprofits. Those are examples of particular licensing policies, not an industry rule requiring EASI to use the same number.

| Threshold | EASI policy tradeoff |
| --- | --- |
| USD 1 million | Begins charging earlier, including modest businesses with limited software budgets. |
| USD 3 million | A middle position that reaches growing startups sooner. |
| USD 5 million | The selected policy: more room for startup adoption before commercial procurement is required. |

The selected threshold is an adoption and funding judgment, not a legal definition of a small business. Gross revenue is easier to state than profit or an undefined phrase such as “real revenue.” Apply it to the worldwide organization group so a large company cannot qualify through a small controlled subsidiary. Do not add an employee or venture-funding cap unless the owner later decides to change the policy.

## Proposed eligibility examples

| Situation | Draft result |
| --- | --- |
| Individual learning or conducting independent research | Free. |
| Recognized public/nonprofit university doing its own research | Free regardless of revenue. |
| Bona fide independent nonprofit, including a nonprofit healthcare organization | Free regardless of revenue. |
| Startup group with USD 4.9 million gross annual revenue | Free, including commercial use. |
| For-profit group with exactly USD 5 million or more | Commercial license required outside evaluation/transition allowances. |
| Large company's internal R&D team | Company's eligibility applies; calling work research does not turn corporate use into personal research. |
| Small subsidiary controlled by a large parent | Parent/group revenue applies. |
| Consultant performing work for an eligible university or startup | Free for that eligible client's work. |
| Consultant deploying EASI into a large corporate client's systems | Client requires a commercial license. |
| Customer receives an image or document processed by an eligible SaaS operator | Output recipient needs no EASI license solely to receive the output. |
| Large customer receives and runs EASI embedded in a shipped product | Requires its own commercial license or coverage under an agreed OEM grant. |
| Startup crosses the threshold or is acquired by a noneligible group | 90-day transition to a commercial license or cessation of otherwise ineligible use. |

The drafts include a 30-day nonproduction evaluation for otherwise ineligible organizations. Academic and nonprofit exceptions cover their legitimate activities; they do not allow a corporation to outsource its own installation to an exempt intermediary. Revisit the hosted-service/OEM language with counsel because it determines procurement obligations for integrators and their customers.

## Commercial terms to complete

The agreement template separates use rights from support and future upgrades. An order must identify the customer, affiliates, covered versions, permitted uses/distribution, fee, perpetual or subscription duration, contacts, and governing law. A license purchase should not imply clinical certification, an indemnity, or an SLA that has not been agreed.

For the first release, a straightforward organization license with explicit v1 rights is easier to explain than per-image charges or a license server. Set pricing and support separately; the revenue threshold is an eligibility rule, not a proposed commercial price. The template leaves fee and duration open rather than inventing a business commitment.

## Adoption and publication work

1. Confirm the ownership chain and contributor permissions for each Licensor-owned file. Confirm that Xinonix can offer both license paths; a contributor agreement must expressly support commercial relicensing rather than relying on an ordinary attribution-only sign-off.
2. Review these custom terms with qualified counsel, including eligibility, transition rights, affiliates, integrator/OEM terms, patent grants, liability, and applicable law. Provide an actual licensing email or contact URL before publication; none has yet been confirmed.
3. Recover and preserve complete original licenses/notices for Apache-2.0 `src/codecs/decoders/JpegDecoder.js`, MIT `src/codecs/decoders/internal/JpegLosslessCore.js`, runtime packages, and any other bundled code. The new revenue restriction cannot replace their original grants.
4. Adopt the final community text as `easi-js/LICENSE`, replace obsolete proprietary/lease-equipment boilerplate only in owned files, and use `"license": "SEE LICENSE IN LICENSE"` in npm metadata and the lockfile's corresponding package metadata. Include required third-party license texts and a NOTICE inventory in the package allowlist.
5. Keep this draft folder outside the production package. A release should include the operative license, not an unfinished contract template that appears to grant paid rights automatically.
6. Decide a separate license for the specification and documentation repository. A permissive documentation license, such as CC BY 4.0, is an option for adoption; changing that repository's terms is separate from adopting the JS community license. The [Creative Commons explanation](https://creativecommons.org/licenses/by/4.0/) describes attribution and reuse under that model. Review rights in incorporated standard text and diagrams before assigning it.
7. Review sample-data and repository-history provenance before any public-repository release. This license deliberately grants no rights in patient or sample datasets.

The current runtime/package license metadata has not been changed, and no public release or commercial agreement has been executed. The drafts give a concrete basis for adoption after the provenance and legal review gates are complete.
