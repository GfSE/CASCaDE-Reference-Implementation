<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:pig="http://product-information-graph.org" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:csc="http://omg.org/CASCaRa/cas/">
	<xsl:output method="xml" encoding="UTF-8" indent="yes" standalone="yes"/>
	<xsl:template match="/">
		<rdf:RDF>
			<xsl:for-each select="//*[local-name()='SPEC-OBJECT']">
				<xsl:variable name="input">
					<xsl:value-of select="@IDENTIFIER"/>
				</xsl:variable>
				<!--Requirement-->
				<pig:anEntity id="{@IDENTIFIER}" rdf:type="IREB.Requirement">
					<dcterms:title>
						<xsl:value-of select="*[local-name()='VALUES']/*[./*[local-name()='DEFINITION']/*[starts-with(local-name(),'ATTRIBUTE-DEFINITION')]=//*[local-name()='SPEC-OBJECT-TYPE']/*[local-name()='SPEC-ATTRIBUTES']/*[@LONG-NAME='ReqIF.Name' or @LONG-NAME='ReqIF.ChapterName']/@IDENTIFIER]/*[local-name()='THE-VALUE']"/>
					</dcterms:title>
					<dcterms:description>
						<xsl:value-of select="*[local-name()='VALUES']/*[./*[local-name()='DEFINITION']/*[starts-with(local-name(),'ATTRIBUTE-DEFINITION')]=//*[local-name()='SPEC-OBJECT-TYPE']/*[local-name()='SPEC-ATTRIBUTES']/*[@LONG-NAME='ReqIF.Text']/@IDENTIFIER]/*[local-name()='THE-VALUE']"/>
					</dcterms:description>
				</pig:anEntity>
			</xsl:for-each>
		</rdf:RDF>
	</xsl:template>
</xsl:stylesheet>