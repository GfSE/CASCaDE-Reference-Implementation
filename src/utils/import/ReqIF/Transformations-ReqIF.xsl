<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<xsl:stylesheet xmlns="http://www.omg.org/spec/ReqIF/20110401/reqif.xsd" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#" xmlns:pig="http://omg.org/CASCaRa/pig/" xmlns:cas="http://omg.org/CASCaRa/cas/" xmlns:ReqIF="http://www.prostep.org/" version="2">
	<xsl:output method="xml" encoding="UTF-8" indent="yes" standalone="yes"/>
	<xsl:template match="/">
		<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
			<xsl:for-each select="//*[local-name()='SPEC-OBJECT']">
				<!--o:{*[local-name()='TYPE']/*[local-name()='SPEC-OBJECT-TYPE-REF']}-->
				<cas:Requirement rdf:about="@IDENTIFIER">
					<dc:identifier>
						<xsl:value-of select="@IDENTIFIER"/>
					</dc:identifier>
					<number>
						<xsl:value-of select="./*[local-name()='VALUES']/*[./*[local-name()='DEFINITION']/*[starts-with(local-name(),'ATTRIBUTE-DEFINITION')]=//*[local-name()='SPEC-OBJECT-TYPE']/*[local-name()='SPEC-ATTRIBUTES']/*[@LONG-NAME='ReqIF.ForeignID']/@IDENTIFIER]/@THE-VALUE"/>
					</number>
					<dc:title>
						<xsl:value-of select="./*[local-name()='VALUES']/*[./*[local-name()='DEFINITION']/*[starts-with(local-name(),'ATTRIBUTE-DEFINITION')]=//*[local-name()='SPEC-OBJECT-TYPE']/*[local-name()='SPEC-ATTRIBUTES']/*[@LONG-NAME='ReqIF.Name']/@IDENTIFIER]/*[local-name()='THE-VALUE']//text()"/>
					</dc:title>
					<dc:description>
						<xsl:value-of select="./*[local-name()='VALUES']/*[./*[local-name()='DEFINITION']/*[starts-with(local-name(),'ATTRIBUTE-DEFINITION')]=//*[local-name()='SPEC-OBJECT-TYPE']/*[local-name()='SPEC-ATTRIBUTES']/*[@LONG-NAME='ReqIF.Text']/@IDENTIFIER]/*[local-name()='THE-VALUE']//text()"/>
					</dc:description>
					<dcterms:modified>
						<xsl:value-of select="@LAST-CHANGE"/>
					</dcterms:modified>
				</cas:Requirement>
			</xsl:for-each>
		</rdf:RDF>
	</xsl:template>
</xsl:stylesheet>
