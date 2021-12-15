precision highp float;
uniform float3 Colour;
varying float3 WorldPosition;


void main()
{
	gl_FragColor = float4( Colour.xyz, 1 );
}


