<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:pig="http://product-information-graph.org" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:csc="http://omg.org/CASCaRA/cas/" xmlns:reqif="http://www.omg.org/spec/ReqIF/20110401/reqif.xsd">
	<xsl:output method="xml" encoding="UTF-8" indent="yes" standalone="yes"/>
	<!-- Root template -->
	<xsl:template match="/">
		<xsl:variable name="header" select="//*[local-name()='REQ-IF-HEADER']"/>
		<pig:aPackage rdf:type="pig:Package">
			<!-- Package ID from REQ-IF-HEADER IDENTIFIER attribute -->
			<xsl:attribute name="id">
				<xsl:choose>
					<xsl:when test="$header/@IDENTIFIER">
						<xsl:value-of select="$header/@IDENTIFIER"/>
					</xsl:when>
					<xsl:otherwise>
						<xsl:text>reqif-package</xsl:text>
					</xsl:otherwise>
				</xsl:choose>
			</xsl:attribute>
			<!-- Package title from TITLE child element -->
			<dcterms:title>
				<xsl:choose>
					<xsl:when test="$header/*[local-name()='TITLE'] and string-length($header/*[local-name()='TITLE']) &gt; 0">
						<xsl:value-of select="$header/*[local-name()='TITLE']"/>
					</xsl:when>
					<xsl:when test="$header/*[local-name()='REPOSITORY-ID'] and string-length($header/*[local-name()='REPOSITORY-ID']) &gt; 0">
						<xsl:text>Requirements from </xsl:text>
						<xsl:value-of select="$header/*[local-name()='REPOSITORY-ID']"/>
					</xsl:when>
					<xsl:otherwise>
						<xsl:text>Requirements from unknown project</xsl:text>
					</xsl:otherwise>
				</xsl:choose>
			</dcterms:title>
			<!-- Package description from COMMENT child element -->
			<dcterms:description>
				<xsl:choose>
					<xsl:when test="$header/*[local-name()='COMMENT'] and string-length($header/*[local-name()='COMMENT']) &gt; 0">
						<xsl:value-of select="$header/*[local-name()='COMMENT']"/>
					</xsl:when>
					<xsl:when test="$header/*[local-name()='REQ-IF-TOOL-ID'] and string-length($header/*[local-name()='REQ-IF-TOOL-ID']) &gt; 0">
						<xsl:text>Created with </xsl:text>
						<xsl:value-of select="$header/*[local-name()='REQ-IF-TOOL-ID']"/>
					</xsl:when>
					<xsl:otherwise>
						<xsl:text>ReqIF Document</xsl:text>
					</xsl:otherwise>
				</xsl:choose>
			</dcterms:description>
			<!-- Package modified date from CREATION-TIME child element -->
			<dcterms:modified>
				<xsl:if test="$header/*[local-name()='CREATION-TIME']">
					<xsl:value-of select="$header/*[local-name()='CREATION-TIME']"/>
				</xsl:if>
			</dcterms:modified>
			<!-- Graph containing all entities -->
			<graph>
				<xsl:apply-templates select="//*[local-name()='SPEC-OBJECT']"/>
			</graph>
		</pig:aPackage>
	</xsl:template>
	<!-- Template for SPEC-OBJECT (entities) -->
	<xsl:template match="*[local-name()='SPEC-OBJECT']">
		<xsl:variable name="objectId" select="@IDENTIFIER"/>
		<xsl:variable name="values" select="*[local-name()='VALUES']"/>
		<!-- Get SPEC-OBJECT-TYPE to determine attribute definitions -->
		<xsl:variable name="typeRef" select="*[local-name()='TYPE']/*/@SPEC-OBJECT-TYPE-REF"/>
		<!-- Find Name/Title attribute definition ID by looking in all ATTRIBUTE-DEFINITION-STRING with matching LONG-NAME -->
		<xsl:variable name="nameAttrDef" select="//*[local-name()='ATTRIBUTE-DEFINITION-STRING'][
            @LONG-NAME='ReqIF.Name' or
            @LONG-NAME='ReqIF.ChapterName' or
            @LONG-NAME='Name' or
            @LONG-NAME='Title'
        ]/@IDENTIFIER"/>
		<!-- Find Text/Description attribute definition ID by looking in all ATTRIBUTE-DEFINITION-XHTML with matching LONG-NAME -->
		<xsl:variable name="textAttrDef" select="//*[local-name()='ATTRIBUTE-DEFINITION-XHTML'][
            @LONG-NAME='ReqIF.Text' or
            @LONG-NAME='Description' or
            @LONG-NAME='Text'
        ]/@IDENTIFIER"/>
		<pig:anEntity rdf:type="IREB:Requirement">
			<xsl:attribute name="id">
				<xsl:value-of select="$objectId"/>
			</xsl:attribute>
			<!-- Entity title - handle both STRING and XHTML variants with fallback -->
			<xsl:variable name="titleValue">
				<xsl:call-template name="getAttributeValue">
					<xsl:with-param name="values" select="$values"/>
					<xsl:with-param name="attrDefId" select="$nameAttrDef"/>
				</xsl:call-template>
			</xsl:variable>

			<!-- Entity description - handle both STRING and XHTML variants -->
			<xsl:variable name="descriptionValue">
				<xsl:call-template name="getAttributeValue">
					<xsl:with-param name="values" select="$values"/>
					<xsl:with-param name="attrDefId" select="$textAttrDef"/>
				</xsl:call-template>
			</xsl:variable>

			<!-- Determine if we have any content: anEntity must have either a title or a description or both -->
			<xsl:variable name="hasTitle" select="string-length(normalize-space($titleValue)) &gt; 0"/>
			<xsl:variable name="hasDescription" select="string-length(normalize-space($descriptionValue)) &gt; 0"/>

			<!-- Title: Only output if found OR if neither title nor description found (fallback) -->
			<xsl:choose>
				<xsl:when test="$hasTitle">
					<!-- Case 1 & 2: Title found → output it -->
					<dcterms:title>
						<xsl:value-of select="$titleValue"/>
					</dcterms:title>
				</xsl:when>
				<xsl:when test="not($hasDescription)">
					<!-- Case 4: Neither title nor description found → fallback -->
					<dcterms:title>
						<xsl:text>Object with id </xsl:text>
						<xsl:value-of select="$objectId"/>
					</dcterms:title>
				</xsl:when>
				<!-- Case 3: No title but description found → NO title element -->
			</xsl:choose>

			<!-- Description: Output only if found (Case 1 & 3) -->
			<xsl:if test="$hasDescription">
				<dcterms:description>
					<xsl:value-of select="$descriptionValue"/>
				</dcterms:description>
			</xsl:if>
			<!-- Entity modified date from LAST-CHANGE attribute -->
			<dcterms:modified>
				<xsl:if test="@LAST-CHANGE and string-length(@LAST-CHANGE) &gt; 0">
					<xsl:value-of select="@LAST-CHANGE"/>
				</xsl:if>
			</dcterms:modified>
		</pig:anEntity>
	</xsl:template>
	<!-- Named template to get attribute value from either STRING or XHTML -->
	<xsl:template name="getAttributeValue">
		<xsl:param name="values"/>
		<xsl:param name="attrDefId"/>
		<!-- Try ATTRIBUTE-VALUE-STRING first (can be used for both title and description) -->
		<xsl:variable name="stringValue" select="$values/*[
            local-name()='ATTRIBUTE-VALUE-STRING' and
            *[local-name()='DEFINITION']/*[local-name()='ATTRIBUTE-DEFINITION-STRING-REF'] = $attrDefId
        ]"/>
		<!-- Try ATTRIBUTE-VALUE-XHTML (can be used for both title and description) -->
		<xsl:variable name="xhtmlValue" select="$values/*[
            local-name()='ATTRIBUTE-VALUE-XHTML' and
            *[local-name()='DEFINITION']/*[local-name()='ATTRIBUTE-DEFINITION-XHTML-REF'] = $attrDefId
        ]"/>
		<xsl:choose>
			<!-- STRING with @THE-VALUE attribute -->
			<xsl:when test="$stringValue/@THE-VALUE and string-length($stringValue/@THE-VALUE) &gt; 0">
				<xsl:value-of select="$stringValue/@THE-VALUE"/>
			</xsl:when>
			<!-- STRING with <THE-VALUE> element -->
			<xsl:when test="$stringValue/*[local-name()='THE-VALUE'] and string-length($stringValue/*[local-name()='THE-VALUE']) &gt; 0">
				<xsl:value-of select="$stringValue/*[local-name()='THE-VALUE']"/>
			</xsl:when>
			<!-- XHTML with <THE-VALUE> child element - copy all content including tags -->
			<xsl:when test="$xhtmlValue/*[local-name()='THE-VALUE']">
				<xsl:copy-of select="$xhtmlValue/*[local-name()='THE-VALUE']/node()"/>
			</xsl:when>
			<!-- XHTML with @THE-VALUE attribute (rare) -->
			<xsl:when test="$xhtmlValue/@THE-VALUE and string-length($xhtmlValue/@THE-VALUE) &gt; 0">
				<xsl:value-of select="$xhtmlValue/@THE-VALUE"/>
			</xsl:when>
		</xsl:choose>
	</xsl:template>
</xsl:stylesheet>
