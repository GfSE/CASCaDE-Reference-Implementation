# CASCaRA-Reference-Implementation

[CASCaRA](https://cascara.gfse.org) (formerly CASCaDE) is a project to standardize collaboration in systems engineering with respect to data format and ontology.
A [Request for Proposal (RFP)](https://www.omg.org/cgi-bin/doc?mantis/24-12-03.pdf) has been accepted by OMG in December 2024.
Information in different formats and from diverse sources are transformed and integrated to a common knowledge graph.

A publicly available reference implementation shall validate the concepts of the standard as developed by the CASCaDE submission team.
Validation is successful, if real-world data is ingested and the information needs of all users in the product lifecycle are met.
Users and software vendors are given the opportunity to influence the project to assure their ideas and needs are met.
A joint effort on fundamental features (where differentiation isn't possible anyways) avoids duplicate work, 
improves quality and assures interoperability.

The reference implementation addresses the following aspects:
- Check data format and constraints according to the [CASCaRA meta-model](https://product-information-graph.org/doc/metamodel/latest/) 
to assure data quality. 
- Persistently store and retrieve PIG data using the standardized API (to be defined).
- View and edit PIG data in a web-browser.
- Transform input data with the formats ReqIF, SysML v1 and v2, STEP and FMI/SSP. Other input formats may follow.
- Integrate input data with different formats to an interwoven knowledge graph.
- Create output data with the formats RDF/Turtle, JSON-LD and XHTML.
- Provide a set of *standard queries* ('competency questions') that work for all data complying with the meta-model.
- Bring the data into a standardized form to facilitate machine learning and AI applications.

Major requirements (capabilities and characteristics) must be satisfied:
- Separate syntax and semantics: The software must not be changed, if the ontology is further developed. 
- Comply with *web-technology* and avoid propriatory formats.
- Extend the software using a documented, if possible standardized plug-in mechanism.

Collaboration rules:
- This repository has two protected branches, namely 'main' and 'dev', where 'dev' is the default.
- The 'main' branch keeps just the released versions. In particular, it has a 'docs' folder which is published by GitHub pages.
- The 'dev' branch merges all development efforts, until a release is made. Then, a pull-request 'main'<--'dev' is initiated.
- All development tasks are planned in [GfSE/projects/5](https://github.com/orgs/GfSE/projects/5).
- When a task (an issue) is assigned and work is about to start, the task status is changed to 'in progress' and a new branch is opened
  from within the task. The branch name will thus begin with the issue number.
- When the issue is done and all tests pass, a pull-request 'dev'<--'NN-issue-name' is initiated.
  A number of rules apply. Among others, a review by GitHub Copilot is started automatically.
  It is advised to respond to the suggestions and to follow them unless wrong. In addition, a team member shall be
  asked to review the changes and to approve the pull-request.
- If all tasks/issues for a given release are closed and all tests pass, the release can be made and a merge with
  'main' may be initiated as described above.
- Design documentation is done via Archi (Archimate Notation) in the '/design/' folder. An HTML is created using the
  [SpecIF App](https://specif.de/apps/edit.html) and published on the
  [CASCaRA Schema Server](https://product-information-graph.org/doc/reference-implementation/).
- Updates of the design documentation are equally merged with branch 'dev', first.

Note:
- Even though the project name has been changed to CASCaRA, the name of the repository is not changed to avoid a mess with cloned repositories.
