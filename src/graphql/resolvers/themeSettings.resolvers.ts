import { ThemeSettings } from '../types/ThemeSettings';
import { GraphQLContext } from '../context';
import { nanoid } from 'nanoid';

function toThemeSettings(obj: any): ThemeSettings | null {
  if (!obj) return null;
  return {
    ...obj,
    createdAt: obj.createdAt instanceof Date ? obj.createdAt.toISOString() : obj.createdAt,
    updatedAt: obj.updatedAt instanceof Date ? obj.updatedAt.toISOString() : obj.updatedAt,
  };
}

export const themeSettingsResolvers = {
  Query: {
    async themeSettings(_: any, { userId }: { userId: string }, ctx: GraphQLContext): Promise<ThemeSettings | null> {
      const result = await ctx.prisma.themeSettings.findUnique({ where: { userId } });
      return toThemeSettings(result);
    },
  },
  Mutation: {
    async createThemeSettings(
      _: any,
      { input }: { input: Partial<ThemeSettings> & { userId: string } },
      ctx: GraphQLContext
    ): Promise<ThemeSettings> {
      const result = await ctx.prisma.themeSettings.create({ 
        data: {
          ...input,
          id: nanoid(),
          updatedAt: new Date()
        } 
      });
      return toThemeSettings(result)!;
    },
    async updateThemeSettings(
      _: any,
      { id, input }: { id: string; input: Partial<ThemeSettings> },
      ctx: GraphQLContext
    ): Promise<ThemeSettings> {
      const result = await ctx.prisma.themeSettings.update({ where: { id }, data: input });
      return toThemeSettings(result)!;
    },
    async deleteThemeSettings(
      _: any,
      { id }: { id: string },
      ctx: GraphQLContext
    ): Promise<boolean> {
      await ctx.prisma.themeSettings.delete({ where: { id } });
      return true;
    },
  },
  User: {
    async themeSettings(parent: any, _: any, ctx: GraphQLContext) {
      const result = await ctx.prisma.themeSettings.findUnique({ where: { userId: parent.id } });
      return toThemeSettings(result);
    },
  },
}; 